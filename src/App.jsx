import { useEffect, useState } from 'react'
import { supabase } from './supabase'

import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay
} from 'date-fns'

function App() {
  const [name, setName] = useState('')
  const [hasPassport, setHasPassport] = useState(null)
  const [availabilityType, setAvailabilityType] = useState('')
  const [advanceNotice, setAdvanceNotice] = useState('')

  const [showCalendar, setShowCalendar] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(
    new Date(2026, 5)
  )

  const minMonth = new Date(2026, 5)
  const maxMonth = new Date(2026, 11)

  const [selectedDates, setSelectedDates] = useState([])

  const [loading, setLoading] = useState(false)

  const [allSubmissions, setAllSubmissions] = useState([])

  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState(null)

  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  function handleContinue() {
    if (!name || hasPassport === null || !availabilityType) {
      alert('Please complete all required fields.')
      return
    }

    setShowCalendar(true)
  }

  function handleDateMouseDown(dateString) {
    setIsDragging(true)

    const currentlySelected =
      selectedDates.includes(dateString)

    const newMode = !currentlySelected

    setDragMode(newMode)

    updateDate(dateString, newMode)
  }

  function handleDateMouseEnter(dateString) {
    if (!isDragging) return

    updateDate(dateString, dragMode)
  }

  function handleMouseUp() {
    setIsDragging(false)
    setDragMode(null)
  }

  function updateDate(dateString, shouldSelect) {
    const currentlySelected =
      selectedDates.includes(dateString)

    if (shouldSelect && !currentlySelected) {
      setSelectedDates((prev) => [
        ...prev,
        dateString
      ])
    }

    if (!shouldSelect && currentlySelected) {
      setSelectedDates((prev) =>
        prev.filter((d) => d !== dateString)
      )
    }
  }

  async function handleFinish() {
    setLoading(true)

    const { error } = await supabase
      .from('availability_submissions')
      .insert([
        {
          name,
          has_passport: hasPassport,
          availability_type: availabilityType,
          advance_notice: advanceNotice,
          selected_dates: selectedDates
        }
      ])

    if (error) {
      console.log(error)

      if (
        error.message.includes(
          'duplicate key value'
        )
      ) {
        alert(
          'This name has already submitted availability.'
        )
      } else {
        alert('Error saving submission.')
      }

      setLoading(false)
      return
    }

    await fetchSubmissions()

    alert('Availability submitted successfully!')

    setLoading(false)
  }

  async function fetchSubmissions() {
    const { data, error } = await supabase
      .from('availability_submissions')
      .select('*')

    if (error) {
      console.log(error)
      return
    }

    setAllSubmissions(data)
  }

  function getAvailabilityCount(dateString) {
    let count = 0

    allSubmissions.forEach((submission) => {
      const selected =
        submission.selected_dates.includes(dateString)

      if (
        submission.availability_type ===
        'flexible_except'
      ) {
        if (!selected) {
          count++
        }
      } else {
        if (selected) {
          count++
        }
      }
    })

    return count
  }

  function getBestWeekends() {
    const weekends = []

    const allDays = eachDayOfInterval({
      start: new Date(2026, 5, 1),
      end: new Date(2026, 11, 31)
    })

    allDays.forEach((day) => {
      if (getDay(day) === 5) {
        const friday = new Date(day)

        const saturday = new Date(day)
        saturday.setDate(friday.getDate() + 1)

        const sunday = new Date(day)
        sunday.setDate(friday.getDate() + 2)

        const fridayCount =
          getAvailabilityCount(
            format(friday, 'yyyy-MM-dd')
          )

        const saturdayCount =
          getAvailabilityCount(
            format(saturday, 'yyyy-MM-dd')
          )

        const sundayCount =
          getAvailabilityCount(
            format(sunday, 'yyyy-MM-dd')
          )

        const average =
          (fridayCount +
            saturdayCount +
            sundayCount) /
          3

        weekends.push({
          label: `${format(
            friday,
            'MMM d'
          )} - ${format(sunday, 'MMM d')}`,
          score: average.toFixed(1)
        })
      }
    })

    weekends.sort(
      (a, b) => b.score - a.score
    )

    return weekends.slice(0, 5)
  }

  function renderCalendar() {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    const days = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    })

    const firstDayOffset = getDay(monthStart)

    return (
      <div>
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f7f7f7',
            borderRadius: '10px'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Instructions
          </h3>

          {availabilityType ===
            'flexible_except' ? (
            <p>
              Green dates mean you are currently
              available. Select dates that do NOT
              work for you.
            </p>
          ) : (
            <p>
              Red dates mean you are currently
              unavailable. Select dates that WOULD
              work for you.
            </p>
          )}

          <p>
            You can click individual dates or
            click-and-drag across multiple days.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '10px',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#4caf50',
                  borderRadius: '4px'
                }}
              ></div>

              <span>Available</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: '#f44336',
                  borderRadius: '4px'
                }}
              ></div>

              <span>Unavailable</span>
            </div>
          </div>
        </div>
        <div style={styles.monthHeader}>
          <button
            style={{
              ...styles.monthButton,
              opacity:
                currentMonth.getMonth() ===
                minMonth.getMonth()
                  ? 0.5
                  : 1
            }}
            disabled={
              currentMonth.getMonth() ===
              minMonth.getMonth()
            }
            onClick={() =>
              setCurrentMonth(
                subMonths(currentMonth, 1)
              )
            }
          >
            ←
          </button>

          <h2>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>

          <button
            style={{
              ...styles.monthButton,
              opacity:
                currentMonth.getMonth() ===
                maxMonth.getMonth()
                  ? 0.5
                  : 1
            }}
            disabled={
              currentMonth.getMonth() ===
              maxMonth.getMonth()
            }
            onClick={() =>
              setCurrentMonth(
                addMonths(currentMonth, 1)
              )
            }
          >
            →
          </button>
        </div>

        <div style={styles.weekdays}>
          {[
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat'
          ].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div style={styles.calendarGrid}>
          {Array.from({
            length: firstDayOffset
          }).map((_, i) => (
            <div key={`empty-${i}`}></div>
          ))}

          {days.map((day) => {
            const dateString = format(
              day,
              'yyyy-MM-dd'
            )

            const isSelected =
              selectedDates.includes(dateString)

            const weekend =
              getDay(day) === 5 ||
              getDay(day) === 6 ||
              getDay(day) === 0

            let backgroundColor

            if (
              availabilityType ===
              'flexible_except'
            ) {
              backgroundColor = isSelected
                ? '#f44336'
                : '#4caf50'
            } else {
              backgroundColor = isSelected
                ? '#4caf50'
                : '#f44336'
            }

            return (
              <div
                key={dateString}
                onMouseDown={() =>
                  handleDateMouseDown(dateString)
                }
                onMouseEnter={() =>
                  handleDateMouseEnter(dateString)
                }
                style={{
                  ...styles.day,
                  backgroundColor,
                  border: weekend
                    ? '2px solid #222'
                    : '1px solid #ccc'
                }}
              >
                {format(day, 'd')}
              </div>
            )
          })}
        </div>

        <button
          style={styles.submitButton}
          onClick={handleFinish}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Finish'}
        </button>
      </div>
    )
  }

  return (
    <div
      style={styles.container}
      onMouseUp={handleMouseUp}
    >
      <h1 style={styles.title}>
        Cousin Trip Scheduler
      </h1>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#333',
            color: 'white'
          }}
          onClick={() => setShowAdmin(!showAdmin)}
        >
          {showAdmin
            ? 'Hide Admin Panel'
            : 'Show Admin Panel'}
        </button>
      </div>

      <div style={styles.card}>
        {!showCalendar ? (
          <>
            <label style={styles.label}>
              Your Name
            </label>

            <input
              style={styles.input}
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your name"
            />

            <label style={styles.label}>
              Do you currently have a passport?
            </label>

            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor:
                    hasPassport === true
                      ? '#4caf50'
                      : '#eee'
                }}
                onClick={() =>
                  setHasPassport(true)
                }
              >
                Yes
              </button>

              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor:
                    hasPassport === false
                      ? '#f44336'
                      : '#eee'
                }}
                onClick={() =>
                  setHasPassport(false)
                }
              >
                No
              </button>
            </div>

            <label style={styles.label}>
              Availability Type
            </label>

            <div style={styles.optionGroup}>
              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor:
                    availabilityType ===
                    'flexible_except'
                      ? '#4caf50'
                      : '#eee'
                }}
                onClick={() =>
                  setAvailabilityType(
                    'flexible_except'
                  )
                }
              >
                Flexible except these dates
              </button>

              <button
                style={{
                  ...styles.optionButton,
                  backgroundColor:
                    availabilityType ===
                    'restricted'
                      ? '#4caf50'
                      : '#eee'
                }}
                onClick={() =>
                  setAvailabilityType(
                    'restricted'
                  )
                }
              >
                Restricted time off
              </button>
            </div>

            <label style={styles.label}>
              Advance notice needed?
            </label>

            <select
              style={styles.input}
              value={advanceNotice}
              onChange={(e) =>
                setAdvanceNotice(
                  e.target.value
                )
              }
            >
              <option value="">
                None
              </option>

              <option value="2_weeks">
                2 weeks
              </option>

              <option value="1_month">
                1 month
              </option>

              <option value="2_months">
                2+ months
              </option>
            </select>

            <button
              style={styles.submitButton}
              onClick={handleContinue}
            >
              Continue
            </button>
          </>
        ) : (
          renderCalendar()
        )}

        {showAdmin && (
          <div
            style={{
              marginBottom: '40px',
              padding: '20px',
              backgroundColor: '#f7f7f7',
              borderRadius: '12px'
            }}
          >
            <h2 style={{ marginBottom: '20px' }}>
              Admin Panel
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {allSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  style={{
                    padding: '14px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    border: '1px solid #ddd'
                  }}
                >
                  <div>
                    <strong>Name:</strong>{' '}
                    {submission.name}
                  </div>

                  <div>
                    <strong>Passport:</strong>{' '}
                    {submission.has_passport
                      ? 'Yes'
                      : 'No'}
                  </div>

                  <div>
                    <strong>Availability:</strong>{' '}
                    {submission.availability_type ===
                      'flexible_except'
                      ? 'Flexible Except'
                      : 'Restricted PTO'}
                  </div>

                  <div>
                    <strong>Advance Notice:</strong>{' '}
                    {submission.advance_notice ||
                      'None'}
                  </div>

                  <div>
                    <strong>Selected Dates:</strong>{' '}
                    {
                      submission.selected_dates
                        .length
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allSubmissions.length > 0 && (
          <div style={{ marginTop: '50px' }}>
            <div
              style={{
                marginBottom: '40px',
                padding: '20px',
                backgroundColor: '#f7f7f7',
                borderRadius: '12px'
              }}
            >
              <h2 style={{ marginBottom: '15px' }}>
                Best Weekend Options
              </h2>

              {getBestWeekends().map(
                (weekend, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px 0',
                      borderBottom:
                        '1px solid #ddd'
                    }}
                  >
                    <strong>
                      #{index + 1}
                    </strong>{' '}
                    — {weekend.label}
                    <div>
                      Availability Score:{' '}
                      {weekend.score}
                    </div>
                  </div>
                )
              )}
            </div>

            <h2 style={{ textAlign: 'center' }}>
              Group Availability Heatmap
            </h2>

            {[5, 6, 7, 8, 9, 10, 11].map(
              (monthIndex) => {
                const monthDate = new Date(
                  2026,
                  monthIndex
                )

                const monthStart =
                  startOfMonth(monthDate)

                const monthEnd =
                  endOfMonth(monthDate)

                const days =
                  eachDayOfInterval({
                    start: monthStart,
                    end: monthEnd
                  })

                const firstDayOffset =
                  getDay(monthStart)

                return (
                  <div
                    key={monthIndex}
                    style={{
                      marginBottom: '40px'
                    }}
                  >
                    <h3
                      style={{
                        textAlign: 'center',
                        marginBottom: '10px'
                      }}
                    >
                      {format(
                        monthDate,
                        'MMMM yyyy'
                      )}
                    </h3>

                    <div style={styles.weekdays}>
                      {[
                        'Sun',
                        'Mon',
                        'Tue',
                        'Wed',
                        'Thu',
                        'Fri',
                        'Sat'
                      ].map((day) => (
                        <div key={day}>
                          {day}
                        </div>
                      ))}
                    </div>

                    <div
                      style={styles.calendarGrid}
                    >
                      {Array.from({
                        length: firstDayOffset
                      }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                        ></div>
                      ))}

                      {days.map((day) => {
                        const dateString =
                          format(
                            day,
                            'yyyy-MM-dd'
                          )

                        const count =
                          getAvailabilityCount(
                            dateString
                          )

                        const intensity =
                          allSubmissions.length ===
                          0
                            ? 0
                            : count /
                              allSubmissions.length

                        let backgroundColor =
                          '#f44336'

                        if (intensity > 0.8) {
                          backgroundColor =
                            '#1b5e20'
                        } else if (
                          intensity > 0.6
                        ) {
                          backgroundColor =
                            '#4caf50'
                        } else if (
                          intensity > 0.4
                        ) {
                          backgroundColor =
                            '#8bc34a'
                        } else if (
                          intensity > 0.2
                        ) {
                          backgroundColor =
                            '#cddc39'
                        }

                        return (
                          <div
                            key={dateString}
                            style={{
                              ...styles.day,
                              backgroundColor,
                              fontSize: '12px'
                            }}
                          >
                            {format(day, 'd')}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f4f4',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },

  title: {
    textAlign: 'center',
    marginBottom: '20px'
  },

  card: {
    maxWidth: '650px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow:
      '0 2px 10px rgba(0,0,0,0.1)'
  },

  label: {
    display: 'block',
    marginTop: '20px',
    marginBottom: '10px',
    fontWeight: 'bold'
  },

  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px',
    boxSizing: 'border-box'
  },

  buttonRow: {
    display: 'flex',
    gap: '10px'
  },

  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  optionButton: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px'
  },

  submitButton: {
    width: '100%',
    marginTop: '30px',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#222',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer'
  },

  monthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },

  monthButton: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  },

  weekdays: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(7, 1fr)',
    marginBottom: '10px',
    fontWeight: 'bold',
    textAlign: 'center'
  },

  calendarGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(7, 1fr)',
    gap: '6px'
  },

  day: {
    aspectRatio: '1',
    width: '100%',
    maxWidth: '80px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold',
    userSelect: 'none',
    margin: '0 auto'
  }
}

export default App