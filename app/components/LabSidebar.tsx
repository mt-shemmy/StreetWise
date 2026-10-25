import React, { useState } from 'react';
import type { Course } from '../../src/Curriculum';
import { THEMES } from '../../src/theme';

export default function LabSidebar({ course, onComplete }: { course: Course, onComplete: () => void }) {
  const theme = THEMES.light;
  const [currentSection, setCurrentSection] = useState(0);

  const lesson = course.lessons?.[0];
  const sections = lesson?.sections || [];
  const section = sections[currentSection];
  if (!section) return null;

  return (
    <aside style={{ width: 'min(350px, 100%)', background: theme.panel, borderRight: `1px solid ${theme.border}`, padding: '20px', color: theme.text, display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      
      <h2 style={{ fontSize: '20px', color: theme.accent, marginBottom: '20px' }}>
        {course.title}
      </h2>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: theme.text }}>
          {section.title}
        </h3>
        
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: theme.muted, whiteSpace: 'pre-wrap', marginBottom: '15px' }}>
          {section.text}
        </p>

        {lesson?.labTask && (
          <div style={{ padding: '15px', backgroundColor: theme.panel2, border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: theme.accent, fontSize: '13px', textTransform: 'uppercase' }}>Lab Objective</h4>
            <p style={{ margin: 0, fontSize: '13px', color: theme.text, lineHeight: '1.5' }}>
              {lesson.labTask}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: `1px solid ${theme.border}`, paddingTop: '15px' }}>
        <button 
          disabled={currentSection === 0}
          onClick={() => setCurrentSection(prev => prev - 1)}
          style={{ padding: '8px 16px', background: currentSection === 0 ? theme.bg : theme.panel2, color: currentSection === 0 ? theme.muted : theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: currentSection === 0 ? 'not-allowed' : 'pointer' }}
        >
          Back
        </button>
        
        {currentSection < sections.length - 1 ? (
          <button 
            onClick={() => setCurrentSection(prev => prev + 1)}
            style={{ padding: '8px 16px', background: theme.panel2, color: theme.text, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Next
          </button>
        ) : (
          <button 
            onClick={onComplete}
            style={{ padding: '8px 16px', background: theme.panel2, color: theme.text, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Finish Lab
          </button>
        )}
      </div>
    </aside>
  );
}
