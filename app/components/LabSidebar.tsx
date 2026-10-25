import React, { useState } from 'react';
import type { Course } from '../../src/Curriculum';

export default function LabSidebar({ course, onComplete }: { course: Course, onComplete: () => void }) {
  const [currentSection, setCurrentSection] = useState(0);

  const lesson = course.lessons?.[0];
  const sections = lesson?.sections || [];
  const section = sections[currentSection];
  if (!section) return null;

  return (
    <aside style={{ width: '350px', background: '#1a1a24', borderRight: '1px solid #31313d', padding: '20px', color: '#eef0f5', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      
      <h2 style={{ fontSize: '20px', color: '#6cb0e8', marginBottom: '20px' }}>
        {course.title}
      </h2>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#fff' }}>
          {section.title}
        </h3>
        
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#b7bac5', whiteSpace: 'pre-wrap', marginBottom: '15px' }}>
          {section.text}
        </p>

        {lesson?.labTask && (
          <div style={{ padding: '15px', backgroundColor: '#182430', border: '1px solid #274a63', borderRadius: '8px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6cb0e8', fontSize: '13px', textTransform: 'uppercase' }}>Lab Objective</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#eef0f5', lineHeight: '1.5' }}>
              {lesson.labTask}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '1px solid #3a3a47', paddingTop: '15px' }}>
        <button 
          disabled={currentSection === 0}
          onClick={() => setCurrentSection(prev => prev - 1)}
          style={{ padding: '8px 16px', background: currentSection === 0 ? '#1b1b25' : '#22222e', color: currentSection === 0 ? '#565a66' : '#eef0f5', border: '1px solid #3a3a47', borderRadius: '6px', cursor: currentSection === 0 ? 'not-allowed' : 'pointer' }}
        >
          Back
        </button>
        
        {currentSection < sections.length - 1 ? (
          <button 
            onClick={() => setCurrentSection(prev => prev + 1)}
            style={{ padding: '8px 16px', background: '#274a63', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Next
          </button>
        ) : (
          <button 
            onClick={onComplete}
            style={{ padding: '8px 16px', background: '#5fcf8a', color: '#123322', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Finish Lab
          </button>
        )}
      </div>
    </aside>
  );
}
