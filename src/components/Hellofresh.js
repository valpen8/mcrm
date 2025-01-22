import React from 'react';
import './styles/Hellofresh.css';

const Hellofresh = () => {
    return (
        <div className="hellofresh-container">
            <h1 className="hellofresh-header">HelloFresh</h1>
            <p className="hellofresh-text">
                Discover delicious recipes and fresh ingredients delivered to your door. 
                Start your healthy cooking journey today!
            </p>
            
            <iframe
        title="Dashboard"
        src="https://codicent.com/html/midsale/embeddeddashboard/index.html?name=MidSale&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6ImU2N2ZjMTM0LTMwNzYtNGEzOS05Y2U2LTBmNDk4YWY2N2NlMCIsIm5pY2tuYW1lIjoiQWJlcmciLCJuYW1lIjoiIiwidXNlcklkIjoiZTY3ZmMxMzQtMzA3Ni00YTM5LTljZTYtMGY0OThhZjY3Y2UwIiwicHJvamVjdCI6ImhlbGxvZnJlc2giLCJuYmYiOjE3Mzc0NzA0OTcsImV4cCI6MTc2OTAwNjQ5NywiaWF0IjoxNzM3NDcwNDk3fQ.KufosCLsjjifeCZQEu4Ie4dJUCob0ykd5pEU46s5ZQY&email=johan%40izaxon.com&codicent=hellofresh"
        width="100%"
        height="800px"
        style={{ border: 0 }}
      ></iframe>
        </div>
    );
};

export default Hellofresh;