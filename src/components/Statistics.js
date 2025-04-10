import React, { useState, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/Statistics.css';
import { useAuth } from '../auth';

const pageSize = 10; // antal dokument per "sida"

const Statistics = () => {
  // Data-states
  const [salesData, setSalesData] = useState([]); // För salesSpecification
  const [finalReports, setFinalReports] = useState([]);
  const [qualityReportsData, setQualityReportsData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  // Ny state för att lagra ALL finalReport-data (utan paginering)
  const [allFinalReportData, setAllFinalReportData] = useState([]);
  // State för att lagra användardata (alla users)
  const [users, setUsers] = useState([]);

  // Extra state för totalsumma per organisation
  const [orgTotals, setOrgTotals] = useState({});

  // Filter och sortering
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [salespersons, setSalespersons] = useState([]);
  const [periods, setPeriods] = useState([]); // Unika perioder
  const [dataSource, setDataSource] = useState('salesSpecification'); // "salesSpecification", "finalReport" eller "kvalité"
  const [managers, setManagers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);

  // Pagination-states
  const [lastSalesSpecDoc, setLastSalesSpecDoc] = useState(null);
  const [lastFinalReportDoc, setLastFinalReportDoc] = useState(null);
  const [lastQualityReportDoc, setLastQualityReportDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // NYA state för attendance (Närvarande, Sjuka, Lediga)
  const [presentCount, setPresentCount] = useState(0);
  const [sickCount, setSickCount] = useState(0);
  const [vacantCount, setVacantCount] = useState(0);

  const { currentUser } = useAuth();

  // -----------------------------
  // Uppdatera säljare dropdown baserat på vald försäljningschef och aktuellt datasource
  useEffect(() => {
    if (dataSource === 'salesSpecification') {
      if (selectedManager) {
        const managerSalespersons = new Set(
          salesData.filter(item => item.managerUid === selectedManager)
                   .map(item => item.salesperson)
        );
        setSalespersons([...managerSalespersons]);
      } else {
        const allSalespersons = new Set(salesData.map(item => item.salesperson));
        setSalespersons([...allSalespersons]);
      }
    } else if (dataSource === 'finalReport') {
      if (selectedManager) {
        const managerSalespersons = new Set(
          finalReports.filter(item => item.managerUid === selectedManager)
                      .map(item => item.salesperson || item.name)
        );
        setSalespersons([...managerSalespersons]);
      } else {
        const allSalespersons = new Set(finalReports.map(item => item.salesperson || item.name));
        setSalespersons([...allSalespersons]);
      }
    } else if (dataSource === 'kvalité') {
      if (selectedManager) {
        const managerSalespersons = new Set(
          qualityReportsData.filter(item => item.managerUid === selectedManager)
                            .map(item => item.teamMember)
        );
        setSalespersons([...managerSalespersons]);
      } else {
        const allSalespersons = new Set(qualityReportsData.map(item => item.teamMember));
        setSalespersons([...allSalespersons]);
      }
    }
  }, [selectedManager, salesData, finalReports, qualityReportsData, dataSource]);
  // -----------------------------

  // Funktion för att räkna total försäljning (alla poster)
  const calculateTotalSales = (data) => {
    const total = data.reduce((sum, item) => {
      const salesValue = item.totalApproved || item.sales || item.total || 0;
      return sum + parseFloat(salesValue);
    }, 0);
    setTotalSales(total);
  };

  // Funktion för att sortera data
  const sortData = (data) => {
    const sortedData = [...data];
    sortedData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedData;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setFilteredData(sortData(filteredData));
  };

  // Funktion för att hämta ALL data (utan limit) för totaler
  const fetchAllDataForTotals = async () => {
    try {
      if (dataSource === 'salesSpecification') {
        // ... existerande kod för salesSpecification
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersDataArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const usersMap = {};
        usersDataArray.forEach(user => { usersMap[user.id] = user; });

        let totalsQuery;
        if (startDate && endDate) {
          totalsQuery = query(
            collectionGroup(db, 'salesSpecifications'),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date')
          );
        } else {
          totalsQuery = query(
            collectionGroup(db, 'salesSpecifications'),
            orderBy('__name__')
          );
        }
        const snapshot = await getDocs(totalsQuery);
        const allData = [];
        snapshot.forEach(specDoc => {
          const specData = specDoc.data();
          const period = specData.period || specDoc.id;
          const parentRef = specDoc.ref.parent.parent;
          const parentUserId = parentRef ? parentRef.id : null;
          const userInfo = usersMap[parentUserId] || {};
          allData.push({
            period,
            totalApproved: specData.totalApproved || 0,
            salesperson: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'N/A',
            salesId: userInfo.salesId || 'N/A',
            managerUid: userInfo.managerUid || '',
            date: specData.date || period,
            type: 'Sales Specification',
            organisation: userInfo.organisation || 'N/A'
          });
        });

        let filtered = [...allData];
        if (selectedManager) {
          filtered = filtered.filter(item => item.managerUid === selectedManager);
          const managerSalespersons = new Set(filtered.map(item => item.salesperson));
          setSalespersons([...managerSalespersons]);
        }
        if (selectedSalesperson) {
          filtered = filtered.filter(
            item =>
              item.name === selectedSalesperson ||
              item.salesperson === selectedSalesperson
          );
        }
        if (selectedPeriod) {
          filtered = filtered.filter(item => item.period === selectedPeriod);
        }
        const sorted = sortData(filtered);
        calculateTotalSales(sorted);
        const totals = {};
        sorted.forEach(item => {
          const org = item.organisation || 'N/A';
          const value = parseFloat(item.totalApproved || item.sales || item.total || 0);
          totals[org] = (totals[org] || 0) + value;
        });
        setOrgTotals(totals);
      } else if (dataSource === 'finalReport') {
        // För finalReport hämtar vi ALL data (utan paginering) och sparar den i allFinalReportData
        let totalsQuery;
        if (startDate && endDate) {
          totalsQuery = selectedManager
            ? query(
                collection(db, 'finalReports'),
                where('managerUid', '==', selectedManager),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date')
              )
            : query(
                collection(db, 'finalReports'),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date')
              );
        } else {
          totalsQuery = selectedManager
            ? query(
                collection(db, 'finalReports'),
                where('managerUid', '==', selectedManager),
                orderBy('date')
              )
            : query(
                collection(db, 'finalReports'),
                orderBy('date')
              );
        }
        const snapshot = await getDocs(totalsQuery);
        const allData = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const reportId = doc.id;
          Object.keys(data.salesData || {}).forEach(key => {
            const salesItem = data.salesData[key];
            allData.push({
              ...salesItem,
              salesId: salesItem.salesId || key,
              sellerUid: key, // Spara även sellerUid
              date: data.date,
              reportId,
              managerUid: data.managerUid,
              location: data.location || 'N/A',
              organisation: data.organisation || 'N/A',
              type: 'Final Report'
            });
          });
        });
        // Spara all finalReport-data (utan paginering)
        setAllFinalReportData(allData);
        // Fortsätt med filtrering om nödvändigt för övriga syften
        let filtered = [...allData];
        if (selectedSalesperson) {
          filtered = filtered.filter(
            item =>
              item.name === selectedSalesperson ||
              item.salesperson === selectedSalesperson
          );
        }
        if (selectedPeriod) {
          filtered = filtered.filter(item => item.date === selectedPeriod);
        }
        const sorted = sortData(filtered);
        calculateTotalSales(sorted);
        const totals = {};
        sorted.forEach(item => {
          const org = item.organisation || 'N/A';
          const value = parseFloat(item.totalApproved || item.sales || 0);
          totals[org] = (totals[org] || 0) + value;
        });
        setOrgTotals(totals);
      } else if (dataSource === 'kvalité') {
        // ... existerande kod för kvalité
        let totalsQuery;
        if (startDate && endDate) {
          totalsQuery = selectedManager
            ? query(
                collection(db, 'qualityReports'),
                where('managerUid', '==', selectedManager),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date')
              )
            : query(
                collection(db, 'qualityReports'),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date')
              );
        } else {
          totalsQuery = selectedManager
            ? query(
                collection(db, 'qualityReports'),
                where('managerUid', '==', selectedManager),
                orderBy('date')
              )
            : query(
                collection(db, 'qualityReports'),
                orderBy('date')
              );
        }
        const snapshot = await getDocs(totalsQuery);
        const allData = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const reportId = doc.id;
          Object.entries(data.members || {}).forEach(([memberId, memberData]) => {
            allData.push({
              reportId,
              date: data.date,
              organisation: data.organisation || 'N/A',
              managerUid: data.managerUid || '',
              teamMember: memberData.name || 'N/A',
              salesId: memberData.salesId || 'N/A',
              regSales: memberData.regSales || 0,
              invalidAmount: memberData.invalidAmount || 0,
              outOfTarget: memberData.outOfTarget || 0,
              pending: memberData.pending || 0,
              total: memberData.total || 0,
              assignedTo: data.assignedTo || [],
              type: 'Quality Report'
            });
          });
        });
        let filtered = [...allData];
        if (selectedSalesperson) {
          filtered = filtered.filter(item => item.teamMember === selectedSalesperson);
        }
        if (selectedPeriod) {
          filtered = filtered.filter(item => item.date === selectedPeriod);
        }
        const sorted = sortData(filtered);
        calculateTotalSales(sorted);
        const totals = {};
        sorted.forEach(item => {
          const org = item.organisation || 'N/A';
          const value = parseFloat(item.total || 0);
          totals[org] = (totals[org] || 0) + value;
        });
        setOrgTotals(totals);
      }
    } catch (error) {
      console.error("Fel vid hämtning av totala data:", error);
    }
  };

  // Klientbaserad filtrering
  const handleFilterChange = () => {
    let filtered;
    if (dataSource === 'salesSpecification') {
      filtered = [...salesData];
    } else if (dataSource === 'finalReport') {
      filtered = [...finalReports];
    } else if (dataSource === 'kvalité') {
      filtered = [...qualityReportsData];
    }

    if (selectedManager) {
      filtered = filtered.filter(item => item.managerUid === selectedManager);
      const managerSalespersons = new Set(filtered.map(item => item.salesperson || item.teamMember));
      setSalespersons([...managerSalespersons]);
    }

    if (selectedSalesperson) {
      filtered = filtered.filter(
        item =>
          item.name === selectedSalesperson ||
          item.salesperson === selectedSalesperson ||
          item.teamMember === selectedSalesperson
      );
    }

    // Filtrera efter status (gäller endast finalReport)
    if (dataSource === 'finalReport' && selectedStatus) {
      filtered = filtered.filter(item => {
        return item.status && item.status.trim().toLowerCase() === selectedStatus.trim().toLowerCase();
      });
    }

    if (selectedPeriod) {
      filtered = filtered.filter(item => item.period === selectedPeriod);
    }

    const sorted = sortData(filtered);
    setFilteredData(sorted);
    calculateTotalSales(sorted);

    if (startDate && endDate) {
      fetchAllDataForTotals();
    }
  };

  // Vid nollställning rensas alla filter inklusive datumfält
  const handleResetFilters = () => {
    setSelectedPeriod('');
    setSelectedSalesperson('');
    setSelectedManager('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    let resetData;
    if (dataSource === 'salesSpecification') {
      resetData = salesData;
      setSalespersons([...new Set(salesData.map(item => item.salesperson))]);
    } else if (dataSource === 'finalReport') {
      resetData = finalReports;
      setSalespersons([...new Set(finalReports.map(item => item.salesperson || item.name))]);
    } else if (dataSource === 'kvalité') {
      resetData = qualityReportsData;
      setSalespersons([...new Set(qualityReportsData.map(item => item.teamMember))]);
    }
    setFilteredData(resetData);
    calculateTotalSales(resetData);
  };

  useEffect(() => {
    const totals = {};
    filteredData.forEach(item => {
      const org = item.organisation || 'N/A';
      const value = parseFloat(item.totalApproved || item.sales || item.total || 0);
      totals[org] = (totals[org] || 0) + value;
    });
    setOrgTotals(totals);
  }, [filteredData]);

  // NY FUNKTION: Hämta attendance-statistik från finalReports utan paginering.
  const fetchAttendanceStats = async () => {
    try {
      if (dataSource === 'finalReport' && startDate && endDate) {
        let attendanceQuery;
        if (selectedManager) {
          attendanceQuery = query(
            collection(db, 'finalReports'),
            where('managerUid', '==', selectedManager),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
        } else {
          attendanceQuery = query(
            collection(db, 'finalReports'),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
        }
        const snapshot = await getDocs(attendanceQuery);
        let totalPresent = 0, totalSick = 0, totalVacant = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          const entries = Object.values(data.salesData || {});
          entries.forEach(entry => {
            const status = entry.status ? entry.status.trim().toLowerCase() : "";
            if (status === "närvarande") {
              totalPresent++;
            } else if (status === "sjuk" || status === "sjuka") {
              totalSick++;
            } else if (status === "ledig" || status === "lediga") {
              totalVacant++;
            }
          });
        });
        setPresentCount(totalPresent);
        setSickCount(totalSick);
        setVacantCount(totalVacant);
      } else {
        setPresentCount(0);
        setSickCount(0);
        setVacantCount(0);
      }
    } catch (error) {
      console.error("Fel vid hämtning av attendance-statistik:", error);
    }
  };

  useEffect(() => {
    fetchAttendanceStats();
  }, [startDate, endDate, selectedManager, dataSource]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        console.log("Ingen inloggad användare");
        return;
      }
      setLastSalesSpecDoc(null);
      setLastFinalReportDoc(null);
      setLastQualityReportDoc(null);
      try {
        if (dataSource === 'salesSpecification') {
          // --- SALES SPECIFICATION ---
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersDataArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const usersMap = {};
          usersDataArray.forEach(user => { usersMap[user.id] = user; });
          let salesSpecsQuery;
          if (startDate && endDate) {
            salesSpecsQuery = query(
              collectionGroup(db, 'salesSpecifications'),
              where('date', '>=', startDate),
              where('date', '<=', endDate),
              orderBy('date'),
              limit(pageSize)
            );
          } else {
            salesSpecsQuery = query(
              collectionGroup(db, 'salesSpecifications'),
              orderBy('__name__'),
              limit(pageSize)
            );
          }
          const salesSpecsSnapshot = await getDocs(salesSpecsQuery);
          const salesSpecificationsArray = [];
          const periodSet = new Set();
          salesSpecsSnapshot.forEach(specDoc => {
            const specData = specDoc.data();
            const period = specData.period || specDoc.id;
            periodSet.add(period);
            const parentRef = specDoc.ref.parent.parent;
            const parentUserId = parentRef ? parentRef.id : null;
            const userInfo = usersMap[parentUserId] || {};
            salesSpecificationsArray.push({
              period,
              totalApproved: specData.totalApproved || 0,
              salesperson: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'N/A',
              salesId: userInfo.salesId || 'N/A',
              managerUid: userInfo.managerUid || '',
              date: specData.date || period,
              type: 'Sales Specification',
              organisation: userInfo.organisation || 'N/A'
            });
          });
          setLastSalesSpecDoc(salesSpecsSnapshot.docs[salesSpecsSnapshot.docs.length - 1]);
          setSalesData(salesSpecificationsArray);
          setFilteredData(salesSpecificationsArray);
          setPeriods([...periodSet]);
          calculateTotalSales(salesSpecificationsArray);
          const managersArray = usersDataArray.filter(user => user.role === 'sales-manager');
          setManagers(managersArray);
          setSalespersons([...new Set(salesSpecificationsArray.map(item => item.salesperson))]);
          console.log("Fetched Sales Specifications:", salesSpecificationsArray);
        } else if (dataSource === 'finalReport') {
          // --- FINAL REPORT ---
          let finalReportsQuery =
            startDate && endDate
              ? selectedManager
                ? query(
                    collection(db, 'finalReports'),
                    where('managerUid', '==', selectedManager),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date'),
                    limit(pageSize)
                  )
                : query(
                    collection(db, 'finalReports'),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date'),
                    limit(pageSize)
                  )
              : selectedManager
              ? query(
                  collection(db, 'finalReports'),
                  where('managerUid', '==', selectedManager),
                  orderBy('date'),
                  limit(pageSize)
                )
              : query(
                  collection(db, 'finalReports'),
                  orderBy('date'),
                  limit(pageSize)
                );
          const finalReportsSnapshot = await getDocs(finalReportsQuery);
          const finalReportsArray = finalReportsSnapshot.docs.flatMap(doc => {
            const data = doc.data();
            const reportId = doc.id;
            return Object.keys(data.salesData || {}).map(key => {
              const salesItem = data.salesData[key];
              return {
                ...salesItem,
                salesId: salesItem.salesId || key,
                sellerUid: key, // Lagra även sellerUid för senare uppslag
                date: data.date,
                reportId,
                managerUid: data.managerUid,
                location: data.location || 'N/A',
                organisation: data.organisation || 'N/A',
                type: 'Final Report'
              };
            });
          });
          setLastFinalReportDoc(finalReportsSnapshot.docs[finalReportsSnapshot.docs.length - 1]);
          setFinalReports(finalReportsArray);
          setFilteredData(finalReportsArray);
          calculateTotalSales(finalReportsArray);
          setPeriods([...new Set(finalReportsArray.map(item => item.date))]);
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersDataArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setManagers(usersDataArray.filter(user => user.role === 'sales-manager'));
          setUsers(usersDataArray);
          setSalespersons([...new Set(finalReportsArray.map(item => item.salesperson || item.name))]);
          const statusSet = new Set(finalReportsArray.map(item => item.status));
          setStatusOptions([...statusSet]);
          console.log("Fetched Final Reports:", finalReportsArray);
        } else if (dataSource === 'kvalité') {
          // --- QUALITY REPORTS ---
          let qualityReportsQuery =
            startDate && endDate
              ? selectedManager
                ? query(
                    collection(db, 'qualityReports'),
                    where('managerUid', '==', selectedManager),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date'),
                    limit(pageSize)
                  )
                : query(
                    collection(db, 'qualityReports'),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date'),
                    limit(pageSize)
                  )
              : selectedManager
              ? query(
                  collection(db, 'qualityReports'),
                  where('managerUid', '==', selectedManager),
                  orderBy('date'),
                  limit(pageSize)
                )
              : query(
                  collection(db, 'qualityReports'),
                  orderBy('date'),
                  limit(pageSize)
                );
          const qualityReportsSnapshot = await getDocs(qualityReportsQuery);
          const qualityReportsArray = qualityReportsSnapshot.docs.flatMap(doc => {
            const data = doc.data();
            const reportId = doc.id;
            return Object.entries(data.members || {}).map(([memberId, memberData]) => ({
              reportId,
              date: data.date,
              organisation: data.organisation || 'N/A',
              managerUid: data.managerUid || '',
              teamMember: memberData.name || 'N/A',
              salesId: memberData.salesId || 'N/A',
              regSales: memberData.regSales || 0,
              invalidAmount: memberData.invalidAmount || 0,
              outOfTarget: memberData.outOfTarget || 0,
              pending: memberData.pending || 0,
              total: memberData.total || 0,
              assignedTo: data.assignedTo || [],
              type: 'Quality Report'
            }));
          });
          setLastQualityReportDoc(qualityReportsSnapshot.docs[qualityReportsSnapshot.docs.length - 1]);
          setQualityReportsData(qualityReportsArray);
          setFilteredData(qualityReportsArray);
          calculateTotalSales(qualityReportsArray);
          setPeriods([...new Set(qualityReportsArray.map(item => item.date))]);
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersDataArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setManagers(usersDataArray.filter(user => user.role === 'sales-manager'));
          setSalespersons([...new Set(qualityReportsArray.map(item => item.teamMember))]);
          console.log("Fetched Quality Reports:", qualityReportsArray);
        }
      } catch (error) {
        console.error("Fel vid hämtning av data:", error);
      }
    };

    fetchData();
  }, [currentUser, dataSource, startDate, endDate, selectedManager]);

  const loadMoreData = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      if (dataSource === 'salesSpecification' && lastSalesSpecDoc) {
        const nextQuery = query(
          collectionGroup(db, 'salesSpecifications'),
          orderBy('__name__'),
          startAfter(lastSalesSpecDoc),
          limit(pageSize)
        );
        const nextSnapshot = await getDocs(nextQuery);
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersDataArray = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const usersMap = {};
        usersDataArray.forEach(user => { usersMap[user.id] = user; });
        const nextData = [];
        const newPeriodSet = new Set();
        nextSnapshot.forEach(specDoc => {
          const specData = specDoc.data();
          const period = specData.period || specDoc.id;
          newPeriodSet.add(period);
          const parentRef = specDoc.ref.parent.parent;
          const parentUserId = parentRef ? parentRef.id : null;
          const userInfo = usersMap[parentUserId] || {};
          nextData.push({
            period,
            totalApproved: specData.totalApproved || 0,
            salesperson: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'N/A',
            salesId: userInfo.salesId || 'N/A',
            managerUid: userInfo.managerUid || '',
            date: specData.date || period,
            type: 'Sales Specification'
          });
        });
        setLastSalesSpecDoc(nextSnapshot.docs[nextSnapshot.docs.length - 1]);
        setSalesData(prev => [...prev, ...nextData]);
        setFilteredData(prev => [...prev, ...nextData]);
        setPeriods(prev => [...new Set([...prev, ...newPeriodSet])]);
        calculateTotalSales([...salesData, ...nextData]);
        setSalespersons(prev => [...new Set([...prev, ...nextData.map(item => item.salesperson)])]);
      } else if (dataSource === 'finalReport' && lastFinalReportDoc) {
        let nextQuery;
        if (startDate && endDate) {
          nextQuery = selectedManager
            ? query(
                collection(db, 'finalReports'),
                where('managerUid', '==', selectedManager),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date'),
                startAfter(lastFinalReportDoc),
                limit(pageSize)
              )
            : query(
                collection(db, 'finalReports'),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date'),
                startAfter(lastFinalReportDoc),
                limit(pageSize)
              );
        } else {
          nextQuery = selectedManager
            ? query(
                collection(db, 'finalReports'),
                where('managerUid', '==', selectedManager),
                orderBy('date'),
                startAfter(lastFinalReportDoc),
                limit(pageSize)
              )
            : query(
                collection(db, 'finalReports'),
                orderBy('date'),
                startAfter(lastFinalReportDoc),
                limit(pageSize)
              );
        }
        const nextSnapshot = await getDocs(nextQuery);
        const nextData = nextSnapshot.docs.flatMap(doc => {
          const data = doc.data();
          const reportId = doc.id;
          return Object.keys(data.salesData || {}).map(key => {
            const salesItem = data.salesData[key];
            return {
              ...salesItem,
              salesId: salesItem.salesId || key,
              sellerUid: key, // Lagra sellerUid
              date: data.date,
              reportId,
              managerUid: data.managerUid,
              location: data.location || 'N/A',
              organisation: data.organisation || 'N/A',
              type: 'Final Report'
            };
          });
        });
        setLastFinalReportDoc(nextSnapshot.docs[nextSnapshot.docs.length - 1]);
        setFinalReports(prev => [...prev, ...nextData]);
        setFilteredData(prev => [...prev, ...nextData]);
        setPeriods(prev => [...new Set([...prev, ...nextData.map(item => item.date)])]);
        calculateTotalSales([...finalReports, ...nextData]);
        setSalespersons(prev => [...new Set([...prev, ...nextData.map(item => item.salesperson || item.name)])]);
      } else if (dataSource === 'kvalité' && lastQualityReportDoc) {
        let nextQuery;
        if (startDate && endDate) {
          nextQuery = selectedManager
            ? query(
                collection(db, 'qualityReports'),
                where('managerUid', '==', selectedManager),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date'),
                startAfter(lastQualityReportDoc),
                limit(pageSize)
              )
            : query(
                collection(db, 'qualityReports'),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date'),
                startAfter(lastQualityReportDoc),
                limit(pageSize)
              );
        } else {
          nextQuery = selectedManager
            ? query(
                collection(db, 'qualityReports'),
                where('managerUid', '==', selectedManager),
                orderBy('date'),
                startAfter(lastQualityReportDoc),
                limit(pageSize)
              )
            : query(
                collection(db, 'qualityReports'),
                orderBy('date'),
                startAfter(lastQualityReportDoc),
                limit(pageSize)
              );
        }
        const nextSnapshot = await getDocs(nextQuery);
        const nextData = nextSnapshot.docs.flatMap(doc => {
          const data = doc.data();
          const reportId = doc.id;
          return Object.entries(data.members || {}).map(([memberId, memberData]) => ({
            reportId,
            date: data.date,
            organisation: data.organisation || 'N/A',
            managerUid: data.managerUid || '',
            teamMember: memberData.name || 'N/A',
            salesId: memberData.salesId || 'N/A',
            regSales: memberData.regSales || 0,
            invalidAmount: memberData.invalidAmount || 0,
            outOfTarget: memberData.outOfTarget || 0,
            pending: memberData.pending || 0,
            total: memberData.total || 0,
            assignedTo: data.assignedTo || [],
            type: 'Quality Report'
          }));
        });
        setLastQualityReportDoc(nextSnapshot.docs[nextSnapshot.docs.length - 1]);
        setQualityReportsData(prev => [...prev, ...nextData]);
        setFilteredData(prev => [...prev, ...nextData]);
        setPeriods(prev => [...new Set([...prev, ...nextData.map(item => item.date)])]);
        calculateTotalSales([...qualityReportsData, ...nextData]);
        setSalespersons(prev => [...new Set([...prev, ...nextData.map(item => item.teamMember)])]);
      }
    } catch (error) {
      console.error("Fel vid paginerad hämtning:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // NYTT: Skapa en lista med unika säljare tillsammans med deras försäljningschef (salesmanager)
  // Här använder vi allFinalReportData (som innehåller ALL finalReport-data under den valda datumintervallen)
  // och summerar den totala inrapporterade siffran för varje säljare.
  // Vi hämtar även "startDatum" och "sistaArbetsdag" från user-collection via den sparade sellerUid:n.
  const uniqueNameTeam =
    dataSource === 'finalReport' && selectedStatus === ""
      ? (() => {
          const sellerMap = new Map(users.map(u => [u.id, u]));
          const managerMap = new Map(
            managers.map(m => [m.id, `${m.firstName} ${m.lastName}`.trim()])
          );
          const dataForAggregation = selectedSalesperson ? filteredData : allFinalReportData;
          const group = dataForAggregation.reduce((acc, item) => {
            const name = (item.name || item.salesperson || '').trim();
            if (!name) return acc;
            const totalValue = parseFloat(item.totalApproved || item.sales || 0);
            const salesManager = managerMap.get(item.managerUid) || 'N/A';
            const sellerDetails = sellerMap.get(item.sellerUid) || {};
            const startDatum = sellerDetails.startDatum || 'N/A';
            const sistaArbetsdag = sellerDetails.sistaArbetsdag || 'N/A';
            if (!acc.has(name)) {
              acc.set(name, { 
                name, 
                salesManager, 
                totalSales: totalValue,
                salesId: item.salesId || 'N/A',
                startDatum,
                sistaArbetsdag
              });
            } else {
              acc.get(name).totalSales += totalValue;
            }
            return acc;
          }, new Map());
          return Array.from(group.values());
        })()
      : [];

  // Ny variabel för Topp 10 baserat på totalSales (fallande)
  const top10 =
    dataSource === 'finalReport' && selectedStatus === ""
      ? [...uniqueNameTeam]
          .sort((a, b) => b.totalSales - a.totalSales)
          .slice(0, 10)
      : [];

  return (
    <div className="statistics-container">
      <h1>Admin Statistik</h1>

      <table className="filter-table">
        <tbody>
          <tr>
            <td><label htmlFor="data-source-select">Välj Datakälla:</label></td>
            <td>
              <select
                id="data-source-select"
                value={dataSource}
                onChange={(e) => {
                  setDataSource(e.target.value);
                  handleResetFilters();
                }}
              >
                <option value="salesSpecification">Säljspecifikation</option>
                <option value="finalReport">Slutrapport</option>
                <option value="kvalité">Kvalité</option>
              </select>
            </td>
            <td><label htmlFor="manager-select">Välj Försäljningschef:</label></td>
            <td>
              <select
                id="manager-select"
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
              >
                <option value="">Alla chefer</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td><label htmlFor="start-date">Startdatum:</label></td>
            <td>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </td>
            <td><label htmlFor="end-date">Slutdatum:</label></td>
            <td>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td><label htmlFor="period-select">Välj Period:</label></td>
            <td>
              <select
                id="period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">Alla perioder</option>
                {periods.map(period => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </td>
            <td><label htmlFor="salesperson-select">Välj Säljare:</label></td>
            <td>
              <select
                id="salesperson-select"
                value={selectedSalesperson}
                onChange={(e) => {
                  setSelectedSalesperson(e.target.value);
                  // Vid val av säljare filtrera direkt
                  handleFilterChange();
                }}
              >
                <option value="">Alla</option>
                {salespersons.map((salesperson, index) => (
                  <option key={index} value={salesperson}>
                    {salesperson}
                  </option>
                ))}
              </select>
            </td>
          </tr>
          {dataSource === 'finalReport' && (
            <tr>
              <td><label htmlFor="status-select">Välj Status:</label></td>
              <td>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">Alla</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td colSpan="2"></td>
            </tr>
          )}
          <tr>
            <td colSpan="4" style={{ textAlign: 'center' }}>
              <button className="filter-button" onClick={handleFilterChange}>Filtrera</button>
              <button className="reset-button" onClick={handleResetFilters}>Nollställ</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="statistics-cards">
        {/* Totalt Försäljning */}
        <div className="statistics-card total-sales-card">
          <h3>Totalt Försäljning</h3>
          <p>{totalSales}</p>
        </div>

        {/* Totalt per Organisation */}
        <div className="statistics-card org-totals-card">
          <h3>Totalt per Organisation</h3>
          {Object.keys(orgTotals).length === 0 ? (
            <p>Ingen data tillgänglig</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Försäljning</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(orgTotals).map(([org, total]) => (
                  <tr key={org}>
                    <td>{org}</td>
                    <td>{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ny box för Närvaro, Sjuka och Lediga (attendance) */}
        <div className="statistics-card attendance-card">
          <h3>Närvaro & Hälsa</h3>
          <ul>
            <li>Närvarande: {presentCount}</li>
            <li>Sjuka: {sickCount}</li>
            <li>Lediga: {vacantCount}</li>
          </ul>
        </div>

        {/* Ny box för Topp 10 */}
        <div className="statistics-card top10-card">
          <h3>Topp 10 under vald period</h3>
          {top10.length > 0 ? (
            <ul>
              {top10.map((entry, index) => (
                <li key={index}>
                  {entry.name} - {entry.totalSales}
                </li>
              ))}
            </ul>
          ) : (
            <p>Ingen data tillgänglig</p>
          )}
        </div>
      </div>

      {/* RESULTAT */}
      {/* När vi är på finalReport med status "Alla" (tom sträng) renderas en tabell med unika säljare,
          där vi visar säljarnamn, sälj‑ID, start datum, sista arbetsdag, försäljningschef (utifrån managerUid)
          samt den summerade totalen från samtliga rapporter.
          Om en säljare är vald i dropdownen visas endast den användaren. */}
      {dataSource === 'finalReport' && selectedStatus === "" ? (
        <div className="unique-names-table" style={{ marginTop: '20px' }}>
          <h2>Unika Säljare</h2>
          {uniqueNameTeam.length > 0 ? (
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>Namn</th>
                  <th>Sales ID</th>
                  <th>Start Datum</th>
                  <th>Sista Arbetsdag</th>
                  <th>Försäljningschef</th>
                  <th>Total Sälj</th>
                </tr>
              </thead>
              <tbody>
                {uniqueNameTeam.map((entry, index) => (
                  <tr key={index}>
                    <td data-label="Namn">{entry.name}</td>
                    <td data-label="Sales ID">{entry.salesId}</td>
                    <td data-label="Start Datum">{entry.startDatum}</td>
                    <td data-label="Sista Arbetsdag">{entry.sistaArbetsdag}</td>
                    <td data-label="Försäljningschef">{entry.salesManager}</td>
                    <td data-label="Total Sälj">{entry.totalSales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Ingen data tillgänglig</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="statistics-table">
            <thead>
              <tr>
                {dataSource === 'kvalité' ? (
                  <>
                    <th onClick={() => handleSort('date')}>
                      Datum {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th>Organisation</th>
                    <th>Teammedlem</th>
                    <th>Sales ID</th>
                    <th>Reg Sälj</th>
                    <th>Ogiltigt Belopp</th>
                    <th>Utanför målgrupp</th>
                    <th>Pending</th>
                    <th>Total</th>
                  </>
                ) : (
                  <>
                    <th>Säljare</th>
                    <th>{dataSource === 'finalReport' ? 'Status' : 'Period'}</th>
                    <th onClick={() => handleSort('date')}>
                      Datum {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    {dataSource === 'finalReport' && <th>Organisation</th>}
                    <th>Försäljning</th>
                    <th>Typ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={dataSource === 'kvalité' ? 9 : dataSource === 'finalReport' ? 6 : 5}>
                    Ingen data tillgänglig
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    {dataSource === 'kvalité' ? (
                      <>
                        <td data-label="Datum">{item.date || 'N/A'}</td>
                        <td data-label="Organisation">{item.organisation || 'N/A'}</td>
                        <td data-label="Teammedlem">{item.teamMember || 'N/A'}</td>
                        <td data-label="Sales ID">{item.salesId || 'N/A'}</td>
                        <td data-label="Reg Sälj">{item.regSales || 0}</td>
                        <td data-label="Ogiltigt Belopp">{item.invalidAmount || 0}</td>
                        <td data-label="Utanför målgrupp">{item.outOfTarget || 0}</td>
                        <td data-label="Pending">{item.pending || 0}</td>
                        <td data-label="Total">{item.total || 0}</td>
                      </>
                    ) : (
                      <>
                        <td data-label="Säljare">{item.name || item.salesperson || 'N/A'}</td>
                        <td data-label={dataSource === 'finalReport' ? "Status" : "Period"}>
                          {dataSource === 'finalReport' ? item.status || 'N/A' : item.period || 'N/A'}
                        </td>
                        <td data-label="Datum">{item.date || 'N/A'}</td>
                        {dataSource === 'finalReport' && <td data-label="Organisation">{item.organisation || 'N/A'}</td>}
                        <td data-label="Försäljning">{item.totalApproved || item.sales || 'N/A'}</td>
                        <td data-label="Typ">{item.type || (dataSource === 'salesSpecification' ? 'Sales Specification' : '')}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        {((dataSource === 'salesSpecification' && lastSalesSpecDoc) ||
          (dataSource === 'finalReport' && lastFinalReportDoc) ||
          (dataSource === 'kvalité' && lastQualityReportDoc)
        ) && (
          <button className="load-more-button" onClick={loadMoreData} disabled={loadingMore}>
            {loadingMore ? 'Laddar...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Statistics;