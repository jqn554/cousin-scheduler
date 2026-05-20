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
  const [availabilityType, setAvailabilityType] =
    useState('')
  const [advanceNotice, setAdvanceNotice] =
    useState('')

  const [showCalendar, setShowCalendar] =
    useState(false)

  const [currentMonth, setCurrentMonth] =
    useState(new Date(2026, 5))

  const minMonth = new Date(2026, 5)
  const maxMonth = new Date(2026, 11)

  const [selectedDates, setSelectedDates] =
    useState([])

  const [loading, setLoading] = useState(false)

  const [allSubmissions, setAllSubmissions] =
    useState([])

  const [isDragging, setIsDragging] =
    useState(false)

  const [dragMode, setDragMode] =
    useState(null)

  const [showAdmin, setShowAdmin] =
    useState(false)

  const [selectedHeatmapDate,
    setSelectedHeatmapDate] = useState(null)

  const adminPassword =
    import.meta.env.VITE_ADMIN_PASSWORD

  useEffect(() => {
    fetchSubmissions()
  }, [])

  function handleContinue() {
    if (
      !name ||
      hasPassport === null ||
      !availabilityType
    ) {
      alert(
        'Please complete all required fields.'
      )
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

  function updateDate(
    dateString,
    shouldSelect
  ) {
    const currentlySelected =
      selectedDates.includes(dateString)

    if (shouldSelect && !currentlySelected) {
      setSelectedDates((prev) => [
        ...prev,
        dateString
      ])
    }

    if (
      !shouldSelect &&
      currentlySelected
    ) {
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

    alert(
      'Availability submitted successfully!'
    )

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

  async function handleDeleteSubmission(
    id,
    name
  ) {
    const confirmed = window.confirm(
      `Delete submission for ${name}?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('availability_submissions')
      .delete()
      .eq('id', id)

    if (error) {
      console.log(error)
      alert('Error deleting submission.')
      return
    }

    await fetchSubmissions()

    alert('Submission deleted.')
  }

  function getAvailabilityCount(dateString) {
    let count = 0

    allSubmissions.forEach((submission) => {
      const selected =
        submission.selected_dates.includes(
          dateString
        )

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

  function getPeopleForDate(dateString) {
    const available = []
    const unavailable = []

    allSubmissions.forEach((submission) => {
      const selected =
        submission.selected_dates.includes(
          dateString
        )

      let isAvailable = false

      if (
        submission.availability_type ===
        'flexible_except'
      ) {
        isAvailable = !selected
      } else {
        isAvailable = selected
      }

      if (isAvailable) {
        available.push(submission.name)
      } else {
        unavailable.push(submission.name)
      }
    })

    return {
      available,
      unavailable
    }
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
        saturday.setDate(
          friday.getDate() + 1
        )

        const sunday = new Date(day)
        sunday.setDate(
          friday.getDate() + 2
        )

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
    const monthStart =
      startOfMonth(currentMonth)

    const monthEnd =
      endOfMonth(currentMonth)

    const days = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    })

    const firstDayOffset =
      getDay(monthStart)

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
              Green dates mean you are
              currently available. Select
              dates that do NOT work for
              you.
            </p>
          ) : (
            <p>
              Red dates mean you are
              currently unavailable.
              Select dates that WOULD
              work for you.
            </p>
          )}

          <p>
            You can click individual
            dates or click-and-drag
            across multiple days.
          </p>
        </div>

        <div style={styles.monthHeader}>
          <button
            style={styles.monthButton}
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
            {format(
              currentMonth,
              'MMMM yyyy'
            )}
          </h2>

          <button
            style={styles.monthButton}
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
            <div key={i}></div>
          ))}

          {days.map((day) => {
            const dateString = format(
              day,
              'yyyy-MM-dd'
            )

            const isSelected =
              selectedDates.includes(
                dateString
              )

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
                  handleDateMouseDown(
                    dateString
                  )
                }
                onMouseEnter={() =>
                  handleDateMouseEnter(
                    dateString
                  )
                }
                style={{
                  ...styles.day,
                  backgroundColor
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
          {loading
            ? 'Saving...'
            : 'Finish'}
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

      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}
      >
        <button
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#333',
            color: 'white'
          }}
          onClick={() => {
            if (showAdmin) {
              setShowAdmin(false)
              return
            }

            const enteredPassword = prompt(
              'Enter admin password'
            )

            if (
              enteredPassword ===
              adminPassword
            ) {
              setShowAdmin(true)
            } else {
              alert('Incorrect password')
            }
          }}
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
            />

            <label style={styles.label}>
              Do you currently have a
              passport?
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
                Flexible except these
                dates
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
              marginTop: '40px',
              marginBottom: '40px',
              padding: '20px',
              backgroundColor: '#f7f7f7',
              borderRadius: '12px'
            }}
          >
            <h2>Admin Panel</h2>

            {allSubmissions.map(
              (submission) => (
                <div
                  key={submission.id}
                  style={{
                    padding: '14px',
                    backgroundColor:
                      'white',
                    borderRadius: '10px',
                    border:
                      '1px solid #ddd',
                    marginBottom: '12px'
                  }}
                >
                  <div>
                    <strong>Name:</strong>{' '}
                    {submission.name}
                  </div>

                  <div>
                    <strong>
                      Passport:
                    </strong>{' '}
                    {submission.has_passport
                      ? 'Yes'
                      : 'No'}
                  </div>

                  <div>
                    <strong>
                      Availability:
                    </strong>{' '}
                    {submission.availability_type ===
                    'flexible_except'
                      ? 'Flexible Except'
                      : 'Restricted PTO'}
                  </div>

                  <button
                    style={{
                      marginTop: '12px',
                      padding:
                        '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor:
                        '#d32f2f',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() =>
                      handleDeleteSubmission(
                        submission.id,
                        submission.name
                      )
                    }
                  >
                    Delete Submission
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {allSubmissions.length > 0 && (
          <div style={{ marginTop: '50px' }}>
            <h2
              style={{ textAlign: 'center' }}
            >
              Group Availability
              Heatmap
            </h2>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}
            >
              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendColor,
                    backgroundColor:
                      '#1b5e20'
                  }}
                ></div>
                <span>Excellent</span>
              </div>

              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendColor,
                    backgroundColor:
                      '#4caf50'
                  }}
                ></div>
                <span>Good</span>
              </div>

              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendColor,
                    backgroundColor:
                      '#8bc34a'
                  }}
                ></div>
                <span>Moderate</span>
              </div>

              <div style={styles.legendItem}>
                <div
                  style={{
                    ...styles.legendColor,
                    backgroundColor:
                      '#f44336'
                  }}
                ></div>
                <span>Poor</span>
              </div>
            </div>

            {[5, 6, 7, 8, 9, 10, 11].map(
              (monthIndex) => {
                const monthDate =
                  new Date(
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
                      marginBottom:
                        '40px'
                    }}
                  >
                    <h3
                      style={{
                        textAlign:
                          'center'
                      }}
                    >
                      {format(
                        monthDate,
                        'MMMM yyyy'
                      )}
                    </h3>

                    <div
                      style={
                        styles.weekdays
                      }
                    >
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
                      style={
                        styles.calendarGrid
                      }
                    >
                      {Array.from({
                        length:
                          firstDayOffset
                      }).map((_, i) => (
                        <div
                          key={i}
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
                          count /
                          allSubmissions.length

                        let backgroundColor =
                          '#f44336'

                        if (
                          intensity > 0.8
                        ) {
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
                            key={
                              dateString
                            }
                            onClick={() =>
                              setSelectedHeatmapDate(
                                dateString
                              )
                            }
                            style={{
                              ...styles.day,
                              backgroundColor,
                              fontSize:
                                '12px'
                            }}
                          >
                            {format(
                              day,
                              'd'
                            )}
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

        {selectedHeatmapDate && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor:
                'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent:
                'center',
              alignItems: 'center',
              zIndex: 1000
            }}
            onClick={() =>
              setSelectedHeatmapDate(null)
            }
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '90%'
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <h2>
                {format(
                  new Date(
                    selectedHeatmapDate
                  ),
                  'MMMM d, yyyy'
                )}
              </h2>

              <div
                style={{
                  marginTop: '20px'
                }}
              >
                <h3>Available</h3>

                {getPeopleForDate(
                  selectedHeatmapDate
                ).available.map(
                  (name) => (
                    <div key={name}>
                      ✅ {name}
                    </div>
                  )
                )}
              </div>

              <div
                style={{
                  marginTop: '20px'
                }}
              >
                <h3>Unavailable</h3>

                {getPeopleForDate(
                  selectedHeatmapDate
                ).unavailable.map(
                  (name) => (
                    <div key={name}>
                      ❌ {name}
                    </div>
                  )
                )}
              </div>

              <button
                style={{
                  marginTop: '25px',
                  padding:
                    '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor:
                    '#333',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={() =>
                  setSelectedHeatmapDate(
                    null
                  )
                }
              >
                Close
              </button>
            </div>
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
    fontFamily: 'Arial, sans-serif',
    color: '#111',
    colorScheme: 'light'    
  },

  title: {
    textAlign: 'center',
    marginBottom: '20px'
  },

  card: {
    color: '#111',
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
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  legendColor: {
    width: '18px',
    height: '18px',
    borderRadius: '4px'
  }
}

export default App