import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BarChart3, Bookmark, BookmarkCheck, Check, ChevronDown,
  CircleHelp, Code2, Flame, GraduationCap, Home, Info, ListChecks, Moon, Play,
  RotateCcw, Search, Settings2, Sparkles, Sun, Target, Trophy, X, Zap
} from 'lucide-react'

type Difficulty = 'easy' | 'medium' | 'hard'
type Question = {
  id: string; week: number; difficulty: Difficulty; slide?: number
  question: string; options: string[]; correctIndex: number; explanation: string
}
type Translation = { question: string; options: string[]; explanation: string }
type Bank = { title: string; questionCount: number; questions: Question[]; translations: Record<string, Translation> }
type Attempt = { selected: number; correct: boolean; at: number }
type Progress = { attempts: Record<string, Attempt[]>; bookmarks: string[]; lastId?: string }
type Mode = 'home' | 'learn' | 'quick' | 'exam' | 'review' | 'challenge' | 'about'

const EMPTY: Progress = { attempts: {}, bookmarks: [] }
const labels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']
const difficultyLabel: Record<Difficulty, string> = { easy: 'سهل', medium: 'متوسط', hard: 'متقدم' }

function useBank() {
  const [bank, setBank] = useState<Bank | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([
      fetch('/Week5_Week6_MCQs.json'),
      fetch('/Week5_Week6_MCQs_ar.json'),
    ]).then(async ([questionsResponse, translationsResponse]) => {
      if (!questionsResponse.ok || !translationsResponse.ok) throw new Error('تعذر تحميل بنك الأسئلة والترجمات')
      const questions = await questionsResponse.json() as Omit<Bank, 'translations'>
      const translations = await translationsResponse.json() as { translations: Record<string, Translation> }
      setBank({ ...questions, translations: translations.translations })
    }).catch(e => setError(e.message))
  }, [])
  return { bank, error }
}

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem('darb-progress') || '') || EMPTY } catch { return EMPTY }
}

function App() {
  const { bank, error } = useBank()
  const [mode, setMode] = useState<Mode>('home')
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('darb-theme') as 'light' | 'dark') || 'light')
  const [textScale, setTextScale] = useState(1)

  useEffect(() => { localStorage.setItem('darb-progress', JSON.stringify(progress)) }, [progress])
  useEffect(() => { localStorage.setItem('darb-theme', theme); document.documentElement.dataset.theme = theme }, [theme])

  const stats = useMemo(() => {
    const attempts = Object.values(progress.attempts).flat()
    const answered = Object.keys(progress.attempts).length
    const correct = attempts.filter(a => a.correct).length
    const wrongIds = Object.entries(progress.attempts).filter(([, a]) => a[a.length - 1]?.correct === false).map(([id]) => id)
    return { answered, correct, accuracy: attempts.length ? Math.round(correct / attempts.length * 100) : 0, wrongIds }
  }, [progress])

  if (error) return <main className="loading error-state"><CircleHelp size={42} /><h1>تعذر تحميل المحتوى</h1><p>{error}</p></main>
  if (!bank) return <main className="loading"><div className="loader" /><p>نجهّز لك تجربة دراسة هادئة...</p></main>

  const toggleBookmark = (id: string) => setProgress(p => ({ ...p, bookmarks: p.bookmarks.includes(id) ? p.bookmarks.filter(x => x !== id) : [...p.bookmarks, id] }))
  const record = (id: string, selected: number, correct: boolean) => setProgress(p => ({ ...p, attempts: { ...p.attempts, [id]: [...(p.attempts[id] || []), { selected, correct, at: Date.now() }] }, lastId: id }))
  const reset = () => { if (confirm('متأكد تريد تصفير كل تقدمك؟')) setProgress(EMPTY) }

  return <div className="app-shell" style={{ '--text-scale': textScale } as React.CSSProperties}>
    <header className="topbar">
      <button className="brand" onClick={() => setMode('home')} aria-label="العودة للرئيسية">
        <span className="brand-mark"><Code2 size={21} /></span>
        <span><strong>درب نفسك</strong><small>Visual Programming</small></span>
      </button>
      <div className="top-actions">
        <button className="icon-btn" onClick={() => setTextScale(s => s >= 1.15 ? 1 : +(s + .05).toFixed(2))} aria-label="تكبير النص"><Settings2 size={19} /></button>
        <button className="icon-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label="تبديل الوضع الليلي">{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <div className="side-label">مساحتك الدراسية</div>
        <NavButton icon={<Home size={18} />} active={mode === 'home'} onClick={() => setMode('home')}>نظرة عامة</NavButton>
        <NavButton icon={<GraduationCap size={18} />} active={mode === 'learn'} onClick={() => setMode('learn')}>وضع التعلّم</NavButton>
        <NavButton icon={<Zap size={18} />} active={mode === 'quick'} onClick={() => setMode('quick')}>تدريب سريع</NavButton>
        <NavButton icon={<Target size={18} />} active={mode === 'exam'} onClick={() => setMode('exam')}>محاكاة الامتحان</NavButton>
        <NavButton icon={<RotateCcw size={18} />} active={mode === 'review'} onClick={() => setMode('review')}>راجع أخطائي <span className="nav-count">{stats.wrongIds.length}</span></NavButton>
        <NavButton icon={<Flame size={18} />} active={mode === 'challenge'} onClick={() => setMode('challenge')}>تحدّي المتقدمين</NavButton>
        <div className="sidebar-bottom">
          <NavButton icon={<Info size={18} />} active={mode === 'about'} onClick={() => setMode('about')}>عن المنصة</NavButton>
          <button className="reset-link" onClick={reset}>تصفير التقدم</button>
        </div>
      </aside>
      <main className="main-content">
        {mode === 'home' && <HomeView bank={bank} stats={stats} progress={progress} onStart={() => setMode('learn')} onQuick={() => setMode('quick')} onReview={() => setMode('review')} />}
        {mode === 'about' && <About />}
        {(mode === 'learn' || mode === 'quick' || mode === 'review' || mode === 'challenge') &&
          <StudyView bank={bank} mode={mode} progress={progress} onRecord={record} onBookmark={toggleBookmark} onExit={() => setMode('home')} />}
        {mode === 'exam' && <ExamView bank={bank} progress={progress} onRecord={record} onExit={() => setMode('home')} />}
      </main>
    </div>
    <footer><span>تطوير الطالب <b>بلال زامل أحمد</b></span><span className="footer-en">Developed by Bilal Zamil Ahmed</span></footer>
  </div>
}

function NavButton({ icon, children, active, onClick }: { icon: React.ReactNode; children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{children}</span></button>
}

function HomeView({ bank, stats, progress, onStart, onQuick, onReview }: { bank: Bank; stats: { answered: number; correct: number; accuracy: number; wrongIds: string[] }; progress: Progress; onStart: () => void; onQuick: () => void; onReview: () => void }) {
  const percent = Math.round(stats.answered / bank.questions.length * 100)
  return <div className="page home-page">
    <div className="hero">
      <div><p className="eyebrow"><Sparkles size={16} /> أهلاً بيك في مساحة المراجعة</p><h1>خلّينا نفهم البرمجة<br /><em>سوه وبهدوء.</em></h1><p className="hero-copy">كل سؤال تحلّه يقرّبك خطوة من الفهم. خذ راحتك وتعلّم على كيفك.</p>
        <div className="hero-actions"><button className="primary-btn" onClick={onStart}><Play size={18} fill="currentColor" /> {stats.answered ? 'كمّل دراستك' : 'يلا نبلّش'}</button><button className="secondary-btn" onClick={onQuick}><Zap size={17} /> تدريب سريع</button></div>
      </div>
      <div className="hero-orbit"><div className="orbit-center"><Code2 size={28} /><span>C#</span></div><div className="orbit-chip chip-one">Events</div><div className="orbit-chip chip-two">WPF</div><div className="orbit-chip chip-three">Delegates</div></div>
    </div>
    <div className="section-heading"><div><p className="eyebrow">ملخّصك اليوم</p><h2>تقدّمك الدراسي</h2></div><span className="muted">{bank.questionCount} سؤال متاح</span></div>
    <div className="stats-grid">
      <StatCard icon={<ListChecks />} label="تمت الإجابة" value={`${stats.answered}`} suffix={`من ${bank.questionCount}`} accent="blue" />
      <StatCard icon={<Trophy />} label="الدقة الكلية" value={`${stats.accuracy}%`} suffix="استمر، أنت ممتاز" accent="green" />
      <StatCard icon={<RotateCcw />} label="تحتاج مراجعة" value={`${stats.wrongIds.length}`} suffix="أسئلة تنتظرك" accent="amber" />
      <div className="progress-card"><div className="card-top"><span>الرحلة الكاملة</span><BarChart3 size={18} /></div><strong>{percent}%</strong><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small>خطوة صغيرة كل يوم تصنع فرقاً كبيراً</small></div>
    </div>
    <div className="home-panels">
      <div className="mode-panel"><div className="section-heading compact"><div><p className="eyebrow">اختر طريقتك</p><h2>شنو يناسبك هسه؟</h2></div></div><div className="mode-grid">
        <ModeCard icon={<GraduationCap />} title="وضع التعلّم" text="جاوب وشوف الشرح مباشرة" color="blue" onClick={onStart} />
        <ModeCard icon={<Zap />} title="تدريب سريع" text="خمسة أسئلة بوقت قصير" color="purple" onClick={onQuick} />
        <ModeCard icon={<RotateCcw />} title="راجع أخطائي" text="حوّل الأخطاء إلى فهم" color="amber" onClick={onReview} />
      </div></div>
      <div className="quote-card"><Sparkles size={20} /><p>“الأخطاء مو نهاية الطريق، هي الخريطة اللي تبيّن لك وين يصير الفهم أقوى.”</p><span>— خذها خطوة بخطوة</span></div>
    </div>
  </div>
}

function StatCard({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: string; suffix: string; accent: string }) {
  return <div className={`stat-card ${accent}`}><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{suffix}</small></div>
}
function ModeCard({ icon, title, text, color, onClick }: { icon: React.ReactNode; title: string; text: string; color: string; onClick: () => void }) {
  return <button className="mode-card" onClick={onClick}><span className={`mode-icon ${color}`}>{icon}</span><span><b>{title}</b><small>{text}</small></span><ArrowLeft size={17} /></button>
}

function StudyView({ bank, mode, progress, onRecord, onBookmark, onExit }: { bank: Bank; mode: Exclude<Mode, 'home'|'exam'|'about'>; progress: Progress; onRecord: (id: string, selected: number, correct: boolean) => void; onBookmark: (id: string) => void; onExit: () => void }) {
  const pool = useMemo(() => {
    const base = mode === 'review' ? bank.questions.filter(q => progress.attempts[q.id]?.[progress.attempts[q.id].length - 1]?.correct === false) : mode === 'challenge' ? bank.questions.filter(q => q.difficulty === 'hard') : bank.questions
    return mode === 'quick' ? shuffle(base).slice(0, Math.min(5, base.length)) : base
  }, [bank.questions, mode]) // a new session starts when the mode changes
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const q = pool[index]
  useEffect(() => { setSelected(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [index])
  if (!q) return <div className="empty-state"><RotateCcw size={32} /><h2>{mode === 'review' ? 'ما عندك أخطاء للمراجعة' : 'ماكو أسئلة متاحة'}</h2><p>استمر على هذا المستوى الرائع، وارجع لاحقاً لتتدرّب أكثر.</p><button className="primary-btn" onClick={onExit}>العودة للرئيسية</button></div>
  const answered = selected !== null
  const isCorrect = selected === q.correctIndex
  const handleAnswer = (i: number) => { if (answered) return; setSelected(i); onRecord(q.id, i, i === q.correctIndex) }
  return <div className="page study-page">
    <div className="study-toolbar"><button className="back-link" onClick={onExit}><ArrowRight size={17} /> رجوع</button><span className="session-pill">{mode === 'quick' ? 'تدريب سريع' : mode === 'review' ? 'مراجعة الأخطاء' : mode === 'challenge' ? 'تحدّي المتقدمين' : 'وضع التعلّم'}</span><button className="bookmark-btn" onClick={() => onBookmark(q.id)} aria-label="حفظ السؤال">{progress.bookmarks.includes(q.id) ? <BookmarkCheck size={20} fill="currentColor" /> : <Bookmark size={20} />}</button></div>
    <div className="question-progress"><span style={{ width: `${(index + 1) / pool.length * 100}%` }} /></div>
    <div className="question-meta"><span>السؤال {index + 1} من {pool.length}</span><span className={`difficulty ${q.difficulty}`}>{difficultyLabel[q.difficulty]}</span><span>المحاضرة {q.week}</span></div>
    <article className="question-card"><div className="question-kicker"><span>VISUAL PROGRAMMING · C#</span>{q.slide && <span>شريحة {q.slide}</span>}</div><h1 dir="ltr" lang="en">{q.question}</h1><p className="translation question-translation">{bank.translations[q.id]?.question}</p>
      <div className="answer-list">{q.options.map((option, i) => <button key={option} dir="ltr" className={`answer-option ${answered && i === q.correctIndex ? 'correct' : ''} ${answered && i === selected && i !== q.correctIndex ? 'wrong' : ''} ${!answered && i === selected ? 'selected' : ''}`} onClick={() => handleAnswer(i)}><span className="answer-label">{labels[i]}</span><span className="answer-copy"><span className="answer-text">{option}</span><span className="translation">{bank.translations[q.id]?.options[i]}</span></span>{answered && i === q.correctIndex && <Check size={19} />}{answered && i === selected && i !== q.correctIndex && <X size={19} />}</button>)}</div>
      {answered && <div className={`feedback ${isCorrect ? 'positive' : 'supportive'}`}><div className="feedback-icon">{isCorrect ? <Check size={20} /> : <Sparkles size={19} />}</div><div><strong>{isCorrect ? 'إجابة صحيحة، أحسنت!' : 'مو مشكلة، المهم نفهم السبب.'}</strong><p>{q.explanation}</p><p className="translation">{bank.translations[q.id]?.explanation}</p><small>الجواب الصحيح: <b dir="ltr">{q.options[q.correctIndex]}</b><span className="translation correct-translation">{bank.translations[q.id]?.options[q.correctIndex]}</span></small></div></div>}
    </article>
    <div className="study-actions"><button className="secondary-btn" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowRight size={17} /> السابق</button><button className="primary-btn" disabled={!answered} onClick={() => setIndex(i => Math.min(i + 1, pool.length - 1))}>{index === pool.length - 1 ? 'أنهيت الجولة' : 'السؤال التالي'} <ArrowLeft size={17} /></button></div>
  </div>
}

function ExamView({ bank, progress, onRecord, onExit }: { bank: Bank; progress: Progress; onRecord: (id: string, selected: number, correct: boolean) => void; onExit: () => void }) {
  const [started, setStarted] = useState(false)
  const [count, setCount] = useState(10)
  const [week, setWeek] = useState<'all' | '5' | '6'>('all')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const questions = useMemo(() => shuffle(bank.questions.filter(q => week === 'all' || q.week === Number(week))).slice(0, count), [bank.questions, week, count])
  if (!started) return <div className="page setup-page"><button className="back-link" onClick={onExit}><ArrowRight size={17} /> رجوع</button><div className="setup-card"><span className="setup-icon"><Target /></span><p className="eyebrow">اختبر نفسك</p><h1>محاكاة الامتحان</h1><p>جاوب براحتك، وما راح تشوف التصحيح إلا بعد التسليم.</p><label>المحاضرات<select value={week} onChange={e => setWeek(e.target.value as typeof week)}><option value="all">الأسبوع الخامس والسادس</option><option value="5">الأسبوع الخامس</option><option value="6">الأسبوع السادس</option></select></label><label>عدد الأسئلة<select value={count} onChange={e => setCount(Number(e.target.value))}><option value="5">5 أسئلة</option><option value="10">10 أسئلة</option><option value="20">20 سؤال</option></select></label><button className="primary-btn wide" onClick={() => setStarted(true)}><Play size={18} fill="currentColor" /> ابدأ المحاكاة</button></div></div>
  const score = questions.filter(q => answers[q.id] === q.correctIndex).length
  if (submitted) return <div className="page result-page"><div className="result-card"><span className="result-trophy"><Trophy /></span><p className="eyebrow">خلصت المحاكاة</p><h1>نتيجتك {score} / {questions.length}</h1><div className="score-ring" style={{ '--score': `${score / questions.length * 100}%` } as React.CSSProperties}><strong>{Math.round(score / questions.length * 100)}%</strong></div><p>{score >= questions.length * .7 ? 'شغل مرتب! مستواك يتقدم بصورة واضحة.' : 'كل محاولة تعلّم جديد. راجع الإجابات وارجع جرّب.'}</p><button className="primary-btn" onClick={onExit}>العودة للرئيسية</button></div><div className="corrections">{questions.map((q, i) => <div className="correction" key={q.id}><span>{i + 1}</span><div><b dir="ltr">{q.question}</b><small className={answers[q.id] === q.correctIndex ? 'text-green' : 'text-coral'}>{answers[q.id] === q.correctIndex ? 'إجابة صحيحة' : `الصحيح: ${q.options[q.correctIndex]}`}</small></div></div>)}</div></div>
  return <div className="page exam-page"><div className="study-toolbar"><button className="back-link" onClick={onExit}><ArrowRight size={17} /> خروج</button><span className="session-pill">محاكاة الامتحان</span><span>{Object.keys(answers).length} / {questions.length} مجاب</span></div><div className="exam-list">{questions.map((q, i) => <div className="exam-question" key={q.id}><div className="question-meta"><span>السؤال {i + 1}</span><span className={`difficulty ${q.difficulty}`}>{difficultyLabel[q.difficulty]}</span></div><h2 dir="ltr">{q.question}</h2><p className="translation question-translation">{bank.translations[q.id]?.question}</p><div className="answer-list">{q.options.map((opt, oi) => <button dir="ltr" key={opt} className={`answer-option ${answers[q.id] === oi ? 'selected' : ''}`} onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}><span className="answer-label">{labels[oi]}</span><span className="answer-copy"><span>{opt}</span><span className="translation">{bank.translations[q.id]?.options[oi]}</span></span></button>)}</div></div>)}</div><button className="primary-btn sticky-submit" onClick={() => { if (Object.keys(answers).length < questions.length && !confirm('باقي أسئلة بدون إجابة. تريد التسليم؟')) return; questions.forEach(q => q.id in answers && onRecord(q.id, answers[q.id], answers[q.id] === q.correctIndex)); setSubmitted(true) }}>تسليم الإجابات <Check size={18} /></button></div>
}

function About() { return <div className="page about-page"><div className="about-hero"><span className="setup-icon"><Code2 /></span><p className="eyebrow">مساحة مصممة للفهم</p><h1>تعلّم على كيفك،<br /><em>وبثقة أكثر.</em></h1><p>درب نفسك منصة مراجعة عربية هادئة تساعدك تستعد لامتحان Visual Programming بدون ضغط، وبأسئلة المحاضرات نفسها.</p></div><div className="about-grid"><div className="about-card"><GraduationCap /><h2>محتوى أصلي</h2><p>120 سؤال من محاضرات الأسبوع الخامس والسادس، مع الإجابات والتفسيرات الأصلية.</p></div><div className="about-card"><Target /><h2>تقدّم محفوظ</h2><p>كل إجابة وحفظ وتقدم يبقى على جهازك حتى تكمل من مكانك.</p></div><div className="about-card"><Sparkles /><h2>تجربة مريحة</h2><p>واجهة عربية أولاً، متجاوبة مع الموبايل والتابلت واللابتوب، وتدعم الوضع الليلي.</p></div></div><div className="developer-card"><span className="developer-avatar">ب</span><div><p className="eyebrow">تطوير الطالب</p><h2>بلال زامل أحمد</h2><p className="footer-en">Developed by Bilal Zamil Ahmed</p></div></div></div> }
function shuffle<T>(array: T[]) { return [...array].sort(() => Math.random() - .5) }

export default App
