import React, { useState } from 'react';
import './styles/PayrollForm.css';

const PayrollForm = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showForm, setShowForm] = useState(false);

  const payrollPeriods = [
    "18 April - 17 Maj",
    "18 Maj - 17 Juni",
    "18 Juni - 17 Juli",
    // Lägg till fler perioder här
  ];

  const employees = [
    "Anna Andersson",
    "Erik Eriksson",
    "Lisa Larsson",
    // Lägg till fler anställda här
  ];

  const handlePeriodChange = (event) => {
    setSelectedPeriod(event.target.value);
    checkIfReadyToShowForm(event.target.value, selectedEmployee);
  };

  const handleEmployeeChange = (event) => {
    setSelectedEmployee(event.target.value);
    checkIfReadyToShowForm(selectedPeriod, event.target.value);
  };

  const checkIfReadyToShowForm = (period, employee) => {
    if (period && employee) {
      setShowForm(true);
    }
  };

  return (
    <div className="payroll-form">
      <div className="selector">
        <label htmlFor="payroll-period">Löneperiod:</label>
        <select id="payroll-period" value={selectedPeriod} onChange={handlePeriodChange}>
          <option value="">Välj period</option>
          {payrollPeriods.map((period, index) => (
            <option key={index} value={period}>
              {period}
            </option>
          ))}
        </select>
      </div>
      <div className="selector">
        <label htmlFor="employee">Anställd:</label>
        <select id="employee" value={selectedEmployee} onChange={handleEmployeeChange}>
          <option value="">Välj anställd</option>
          {employees.map((employee, index) => (
            <option key={index} value={employee}>
              {employee}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="details-form">
          <h3>Lönespecifikation</h3>
          <label>
            Utbetalningsdatum:
            <input type="text" placeholder="27-Jun" />
          </label>
          <label>
            Säljare:
            <input type="text" placeholder={selectedEmployee} />
          </label>
          <label>
            Säljid:
            <input type="text" placeholder="4829" />
          </label>
          <label>
            Kampanj:
            <input type="text" placeholder="GSM" />
          </label>
          <label>
            Team:
            <input type="text" placeholder="Göteborg" />
          </label>
          <label>
            Behandlade avtal:
            <input type="number" placeholder="63" />
          </label>
          <label>
            Godkända:
            <input type="number" placeholder="41" />
          </label>
          <label>
            Täckning saknas:
            <input type="number" placeholder="2" />
          </label>
          <label>
            Ogiltiga:
            <input type="number" placeholder="4" />
          </label>
          <label>
            Felaktiga:
            <input type="number" placeholder="2" />
          </label>
          <label>
            Ånger:
            <input type="number" placeholder="14" />
          </label>
          <label>
            Lönegrundade avtal:
            <input type="number" placeholder="42" />
          </label>
          <label>
            Provision:
            <input type="text" placeholder="500 kr" />
          </label>
          <label>
            Lön:
            <input type="text" placeholder="21,000 kr" />
          </label>
        </div>
      )}
    </div>
  );
};

export default PayrollForm;