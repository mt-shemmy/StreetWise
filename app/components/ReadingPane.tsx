import React from 'react';
import type { Course, CourseLesson } from '../../src/Curriculum';
import type { AppTheme } from '../../src/theme';
import styles from './ReadingPane.module.css';

interface ReadingPaneProps {
  course: Course;
  lesson: CourseLesson;
  theme: AppTheme;
}

export default function ReadingPane({ course, lesson, theme }: ReadingPaneProps) {
  const containerStyle = {
    borderRight: `1px solid ${theme.border}`,
    backgroundColor: theme.panel,
    '--reading-track': theme.panel,
    '--reading-thumb': theme.borderStrong,
    '--reading-thumb-hover': theme.accent,
    '--back-btn-hover-bg': theme.panel,
    '--back-btn-hover-color': theme.accentBright,
    '--back-btn-hover-border': theme.accentBright,
    '--back-btn-glow': `${theme.accentBright}20`,
    '--terminal-box-glow': `${theme.accent}30`,
    '--terminal-box-hover-border': theme.accentBright,
  } as React.CSSProperties;

  return (
    <div className={styles.readingPane} style={containerStyle}>
      <div
        style={{
          padding: '24px 24px 20px',
          borderBottom: `1px solid ${theme.border}`,
          position: 'sticky',
          top: 0,
          backgroundColor: `${theme.panel}f5`,
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <button
          className={styles.backBtn}
          onClick={() => (window.location.href = '/dashboard.html')}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: theme.panel2,
            color: theme.accent,
            border: `1px solid ${theme.borderStrong}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Save & Exit Workspace
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span
            style={{
              padding: '4px 8px',
              backgroundColor: `${theme.accent}20`,
              color: theme.accent,
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {course.level}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: theme.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600',
            }}
          >
            {course.title}
          </span>
        </div>
        <h2
          style={{
            fontSize: '26px',
            margin: 0,
            color: theme.text,
            lineHeight: '1.25',
            letterSpacing: '-0.5px',
            fontWeight: '800',
          }}
        >
          {lesson.title}
        </h2>
      </div>

      <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: theme.panel2,
            borderRadius: '10px',
            borderLeft: `4px solid ${theme.accentBright}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.accentBright} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <strong
              style={{
                fontSize: '12px',
                color: theme.text,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Primary Objective
            </strong>
          </div>
          <p style={{ fontSize: '15px', color: theme.muted, margin: 0, lineHeight: '1.6' }}>{lesson.goal}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {lesson.sections.map((section, index) => (
            <div key={index}>
              <h4
                style={{
                  fontSize: '17px',
                  color: theme.text,
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.3px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: theme.accent,
                  }}
                />
                {section.title}
              </h4>
              <p
                style={{
                  fontSize: '15px',
                  color: theme.muted,
                  lineHeight: '1.7',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {section.text}
              </p>
            </div>
          ))}
        </div>

        <div
          className={styles.terminalTaskBox}
          style={{
            padding: '24px',
            backgroundColor: theme.termBg,
            border: `1px solid ${theme.borderStrong}`,
            borderRadius: '12px',
            marginTop: '12px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: theme.accent,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '6px', backgroundColor: `${theme.accent}15`, borderRadius: '6px' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <h4
              style={{
                margin: 0,
                color: theme.accent,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: '800',
              }}
            >
              System Terminal Task
            </h4>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: theme.termText,
              lineHeight: '1.6',
              fontFamily: '"JetBrains Mono", "Consolas", monospace',
            }}
          >
            {lesson.labTask}
          </p>
        </div>
      </div>
    </div>
  );
}

