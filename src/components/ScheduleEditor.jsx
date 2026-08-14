// ============================================================================
//  src/components/ScheduleEditor.jsx
// ----------------------------------------------------------------------------
//  Programul de funcționare. Array structurat, nu text liber, pentru că e
//  nevoie de el în două locuri cu cerințe diferite: afișarea din pagina de
//  contact ȘI `openingHoursSpecification` din JSON-LD, pe care Google îl
//  citește și îl arată direct în rezultatele căutării.
//
//  Butonul „Aplică la toate zilele lucrătoare" nu e un moft: fără el, la
//  fiecare parc nou completezi manual cinci rânduri identice.
// ============================================================================

const DAYS = [
    { day: 1, label: 'Luni' },
    { day: 2, label: 'Marți' },
    { day: 3, label: 'Miercuri' },
    { day: 4, label: 'Joi' },
    { day: 5, label: 'Vineri' },
    { day: 6, label: 'Sâmbătă' },
    { day: 0, label: 'Duminică' },
];

export default function ScheduleEditor({ schedule, onChange }) {
    const byDay = new Map((schedule || []).map((d) => [Number(d.day), d]));

    const get = (day) =>
        byDay.get(day) || { day, open: '09:00', close: '18:00', closed: day === 0 };

    const patch = (day, field, value) => {
        const next = DAYS.map(({ day: d }) => {
            const cur = get(d);
            return d === day ? { ...cur, [field]: value } : cur;
        });
        onChange(next);
    };

    const applyToWeekdays = () => {
        const mon = get(1);
        onChange(DAYS.map(({ day: d }) => {
            const cur = get(d);
            if (d >= 1 && d <= 5) return { ...cur, open: mon.open, close: mon.close, closed: mon.closed };
            return cur;
        }));
    };

    return (
        <div className="schedule-editor">
            {DAYS.map(({ day, label }) => {
                const d = get(day);
                return (
                    <div className={`schedule-row ${d.closed ? 'is-closed' : ''}`} key={day}>
                        <span className="schedule-day">{label}</span>
                        <input
                            type="time" value={d.open} disabled={d.closed}
                            onChange={(e) => patch(day, 'open', e.target.value)}
                        />
                        <span className="schedule-dash">–</span>
                        <input
                            type="time" value={d.close} disabled={d.closed}
                            onChange={(e) => patch(day, 'close', e.target.value)}
                        />
                        <label className="schedule-closed">
                            <input
                                type="checkbox" checked={!!d.closed}
                                onChange={(e) => patch(day, 'closed', e.target.checked)}
                            />
                            <span>Închis</span>
                        </label>
                    </div>
                );
            })}
            <button type="button" className="ghost-btn" onClick={applyToWeekdays}>
                Aplică orarul de luni la toate zilele lucrătoare
            </button>
        </div>
    );
}
