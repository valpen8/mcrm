import React from 'react';
import './styles/FactorDashboard.css';

const FactorDashboard = () => {
  return (
    <div className="factor-dashboard">
      <h1>Dashboard Factor</h1>
      <p>Välkommen till Factors aktivitet´s logg.</p>
      <p>Tänk på att loggen inte är 100% då den är baserad på hur aktiv säljaren är i användingen i systemet.</p>
      <iframe
        title="Dashboard"
        src="https://codicent.com/html/midsale/embeddeddashboard/index.html?name=johan&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImU2N2ZjMTM0LTMwNzYtNGEzOS05Y2U2LTBmNDk4YWY2N2NlMCIsIm5pY2tuYW1lIjoiQWJlcmciLCJuYW1lIjoiIiwidXNlcklkIjoiZTY3ZmMxMzQtMzA3Ni00YTM5LTljZTYtMGY0OThhZjY3Y2UwIiwicHJvamVjdCI6ImhlbGxvZnJlc2giLCJuYmYiOjE3MzY1MDk5NzEsImV4cCI6MTc2ODA0NTk3MSwiaWF0IjoxNzM2NTA5OTcxfQ.zPguA84qNygDZNNo5ynSWHyTr4kjIXVDFiCouBGeHFw&email=johan%40izaxon.com&codicent=factor"
        width="100%"
        height="800px"
        style={{ border: 0 }}
      ></iframe>
    </div>
  );
};

export default FactorDashboard;