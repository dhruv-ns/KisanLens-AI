import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import LoadingSkeleton from './components/LoadingSkeleton';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CropScanner = lazy(() => import('./pages/CropScanner'));
const CropAnalysisResult = lazy(() => import('./pages/CropAnalysisResult'));
const Weather = lazy(() => import('./pages/Weather'));
const Market = lazy(() => import('./pages/Market'));
const Assistant = lazy(() => import('./pages/Assistant'));
const FarmProfile = lazy(() => import('./pages/FarmProfile'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSkeleton /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crop-scanner" element={<CropScanner />} />
          <Route path="/crop-analysis/:id" element={<CropAnalysisResult />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/market" element={<Market />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/farm" element={<FarmProfile />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
