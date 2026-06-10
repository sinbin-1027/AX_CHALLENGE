import { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { calcEngine } from './utils/calcEngine';

const OVERRIDES = {
  headcount: 14,
  fixedTargets: {
    green_product: 2247000,
    jawal_veteran:  1420000,
  },
};

function App() {
  const [result, setResult] = useState(null);

  const handleDataLoad = (rows) => {
    setResult(calcEngine(rows, OVERRIDES));
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>공공구매 실적 대시보드</h1>

      <FileUpload onDataLoad={handleDataLoad} />

      {result && (
        <Dashboard
          results={result.results}
          totalScore={result.totalScore}
          finalScore={result.finalScore}
          stats={result.stats}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 32,
    color: '#1e293b',
  },
};

export default App;
