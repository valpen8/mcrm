import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './styles/SalesSpecification.css';

const SalesSpecification = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Förvalt år är det aktuella året
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    totalProcessed: '',
    approved: '',
    missingCoverage: '',
    invalid: '',
    incorrect: '',
    withdrawal: '',
    previousAdjustment: '',
    totalApproved: '',
    commission: '',
    salary: '',
  });
  const [periods, setPeriods] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // Funktion för att generera perioder för hela året med aktuellt år
  const generatePeriods = (year) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];

    const generatedPeriods = [];
    for (let i = 0; i < months.length; i++) {
      const startMonth = months[i];
      const endMonth = months[(i + 1) % months.length];
      generatedPeriods.push(`18 ${startMonth} - 17 ${endMonth} ${year}`);
    }
    return generatedPeriods;
  };

  useEffect(() => {
    // Generera perioder för det valda året
    setPeriods(generatePeriods(selectedYear));

    // Hämta anställda
    const fetchEmployees = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const employeeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(employeeList);

      // Hämta tillgängliga år baserat på befintliga specifikationer
      const years = new Set();
      querySnapshot.docs.forEach((doc) => {
        const specifications = doc.data().salesSpecifications || {};
        Object.keys(specifications).forEach((period) => {
          const year = period.split(' ').pop(); // Extrahera år från perioden
          years.add(year);
        });
      });
      setAvailableYears([...years].sort((a, b) => b - a)); // Sortera åren i fallande ordning
    };

    fetchEmployees();
  }, [selectedYear]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => {
      const updatedFormData = { ...prevState, [name]: value };

      // Beräkna "Godkända"
      if (['totalProcessed', 'missingCoverage', 'invalid', 'incorrect', 'withdrawal'].includes(name)) {
        const totalProcessed = parseInt(updatedFormData.totalProcessed) || 0;
        const missingCoverage = parseInt(updatedFormData.missingCoverage) || 0;
        const invalid = parseInt(updatedFormData.invalid) || 0;
        const incorrect = parseInt(updatedFormData.incorrect) || 0;
        const withdrawal = parseInt(updatedFormData.withdrawal) || 0;

        const approved = totalProcessed - (missingCoverage + invalid + incorrect + withdrawal);
        updatedFormData.approved = approved >= 0 ? approved : 0;
      }

      // Beräkna "Lönegrundade avtal"
      if (['approved', 'previousAdjustment'].includes(name)) {
        const approved = parseInt(updatedFormData.approved) || 0;
        const previousAdjustment = parseInt(updatedFormData.previousAdjustment) || 0;

        const totalApproved = approved + previousAdjustment;
        updatedFormData.totalApproved = totalApproved >= 0 ? totalApproved : 0;
      }

      // Beräkna "Lön"
      if (['totalApproved', 'commission'].includes(name)) {
        const totalApproved = parseInt(updatedFormData.totalApproved) || 0;
        const commission = parseFloat(updatedFormData.commission) || 0;

        const salary = totalApproved * commission;
        updatedFormData.salary = salary >= 0 ? salary : 0;
      }

      return updatedFormData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployee && selectedPeriod) {
      try {
        const userRef = doc(db, 'users', selectedEmployee);
        const userDoc = await getDoc(userRef);

        const existingSpecifications = userDoc.data().salesSpecifications || {};
        const periodWithYear = `${selectedPeriod} ${selectedYear}`; // Lägger till år till perioden
        existingSpecifications[periodWithYear] = formData;

        await updateDoc(userRef, { salesSpecifications: existingSpecifications });
        alert('Säljspecifikation sparad!');
      } catch (error) {
        console.error('Fel vid uppdatering av säljspecifikation:', error);
        alert('Kunde inte spara säljspecifikationen.');
      }
    } else {
      alert('Vänligen välj en anställd och en löneperiod.');
    }
  };

  return (
    <div className="sales-specification-container">
      <h1>Säljspecifikation</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="year">Välj År</label>
        <select
          id="year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[...new Set([new Date().getFullYear(), ...availableYears])].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <label htmlFor="period">Löneperiod</label>
        <select
          id="period"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="">Välj en period</option>
          {periods.map((period, index) => (
            <option key={index} value={period}>
              {period}
            </option>
          ))}
        </select>

        <label htmlFor="employee">Anställd</label>
        <select
          id="employee"
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
        >
          <option value="">Välj en anställd</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.firstName} {employee.lastName}
            </option>
          ))}
        </select>

        <h2>Behandlade avtal</h2>
        <label htmlFor="totalProcessed">Totalt inlästa:</label>
        <input
          type="number"
          id="totalProcessed"
          name="totalProcessed"
          value={formData.totalProcessed}
          onChange={handleInputChange}
        />

        <label htmlFor="missingCoverage">Täckning saknas:</label>
        <input
          type="number"
          id="missingCoverage"
          name="missingCoverage"
          value={formData.missingCoverage}
          onChange={handleInputChange}
        />

        <label htmlFor="invalid">Ogiltiga:</label>
        <input
          type="number"
          id="invalid"
          name="invalid"
          value={formData.invalid}
          onChange={handleInputChange}
        />

        <label htmlFor="incorrect">Felaktiga:</label>
        <input
          type="number"
          id="incorrect"
          name="incorrect"
          value={formData.incorrect}
          onChange={handleInputChange}
        />

        <label htmlFor="withdrawal">Ånger:</label>
        <input
          type="number"
          id="withdrawal"
          name="withdrawal"
          value={formData.withdrawal}
          onChange={handleInputChange}
        />

        <label htmlFor="approved">Godkända:</label>
        <input
          type="number"
          id="approved"
          name="approved"
          value={formData.approved}
          readOnly
        />

        <h2>Löneberäkning</h2>
        <label htmlFor="previousAdjustment">Justering tidigare period:</label>
        <input
          type="number"
          id="previousAdjustment"
          name="previousAdjustment"
          value={formData.previousAdjustment}
          onChange={handleInputChange}
        />

        <label htmlFor="totalApproved">Lönegrundade avtal:</label>
        <input
          type="number"
          id="totalApproved"
          name="totalApproved"
          value={formData.totalApproved}
          readOnly
        />

        <label htmlFor="commission">Provision:</label>
        <input
          type="number"
          id="commission"
          name="commission"
          value={formData.commission}
          onChange={handleInputChange}
        />

        <label htmlFor="salary">Lön:</label>
        <input
          type="number"
          id="salary"
          name="salary"
          value={formData.salary}
          readOnly
        />

        <button type="submit">Spara</button>
      </form>
    </div>
  );
};

export default SalesSpecification;