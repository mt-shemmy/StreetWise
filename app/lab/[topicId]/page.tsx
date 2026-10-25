"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CURRICULUM } from '../../../src/Curriculum';
import { THEMES } from '../../../src/theme';
import ReadingPane from '../../components/ReadingPane';
import SimulatorCanvas from '../../components/SimulatorCanvas';
import HardwareTray from '../../components/HardwareTray';

export default function LabEnvironment() {
  const params = useParams();
  const topicId = params.topicId as string;
  const course = CURRICULUM[topicId];
  const lesson = course?.lessons[0];

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("streetwiseCurrentUser");
      if (userStr) {
        const user = JSON.parse(userStr);
        const prefsStr = localStorage.getItem("streetwisePreferences");
        if (prefsStr) {
          const prefs = JSON.parse(prefsStr);
          if (prefs[user.email] && prefs[user.email].theme) {
            setThemeMode(prefs[user.email].theme);
          }
        }
      }
    } catch (e) {
      console.error("Could not sync Streetwise theme", e);
    }
  }, []);

  const theme = THEMES[themeMode];

  if (!course || !lesson) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: theme.bg,
          color: theme.text,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2>Interactive Lab Unavailable</h2>
        <button
          onClick={() => (window.location.href = '/dashboard.html')}
          style={{
            padding: '10px 20px',
            background: theme.accent,
            color: theme.bg,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div
      className="lab-workspace"
      style={{
        display: 'flex',
        width: '100%',
        backgroundColor: theme.bg,
        color: theme.text,
        transition: 'background-color 0.3s ease',
      }}
    >
      <ReadingPane course={course} lesson={lesson} theme={theme} />

      <div
        className="lab-simulator"
        style={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Canvas occupies remaining top space */}
        <div style={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
          <SimulatorCanvas theme={theme} />
        </div>

        {/* The horizontal Hardware Tray docked at the bottom */}
        <div className="lab-toolbox" style={{ flexShrink: 0, zIndex: 10, boxShadow: '0 -10px 30px rgba(0,0,0,0.05)' }}>
          <HardwareTray theme={theme} />
        </div>
      </div>
    </div>
  );
}
