import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Save, Search, CalendarDays, Users, DollarSign, Clock, Building, Banknote, UserCircle, FileText, Trash2, AlertTriangle, ListChecks, Download, X, Sparkles, Copy, Loader2, PlayCircle, StopCircle, Info, History } from 'lucide-react';
import LoginPage from './LoginPage';

// --- 환경 변수에서 설정값 가져오기 (가장 먼저 실행) ---
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};
const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;

// --- Firebase 초기화 ---
let app;
let db;
let auth;
// apiKey가 실제로 존재할 때만 초기화를 시도합니다.
if (firebaseConfig.apiKey) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
    } catch (error) {
      console.error("Firebase 초기화 오류:", error);
    }
}

// --- 앱 전체에서 사용될 상수들 ---
const PARKING_LOCATIONS = [
  "어린이회관 주차장1", "어린이회관 주차장2", "세종대 대양AI센터 주차장",
  "국민은행 주차장", "교회 뒷편 세종대 주차장", "광진광장 공영주차장"
];
const ALL_LOCATIONS_VALUE = "ALL_PARKING_LOCATIONS";
const POSITIONS = ["청년", "성도", "집사", "권사", "장로", "목사"];
const DEFAULT_HOURLY_RATE = 3000;
const BANK_NAMES_RAW = ["우리", "기업", "산업", "국민", "농협", "하나", "신한", "한국씨티", "토스뱅크", "케이뱅크", "카카오뱅크", "수협", "외환", "SC제일"];
const BANK_NAMES_WITH_OTHER = [...BANK_NAMES_RAW.sort((a, b) => a.localeCompare(b, 'ko-KR')), "기타"];
const formInputOneUI = "block w-full px-5 py-3.5 text-base text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white hover:border-slate-300";

// ==================================================================
// 작은 헬퍼(도우미) 컴포넌트들
// ==================================================================
const FormItem = ({ icon: IconComponent, label, children }) => (
    <div>
        <label className="block text-lg font-semibold text-slate-700 mb-3 flex items-center">
            {IconComponent && <IconComponent className="w-7 h-7 text-slate-500 mr-3.5" /> }
            {label}
        </label>
        {children}
    </div>
);
const Th = ({ children, className = '' }) => <th scope="col" className={`px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider ${className}`}>{children}</th>;
const Td = ({ children, className = '' }) => <td className={`px-6 py-5 whitespace-nowrap text-base text-slate-700 ${className}`}>{children}</td>;


// ==================================================================
// EntryForm 컴포넌트
// ==================================================================
function EntryForm({ db, userId, setDbError }) {
    const [parkingLocation, setParkingLocation] = useState(PARKING_LOCATIONS[0]);
    const [parkingDate, setParkingDate] = useState(new Date().toISOString().split('T')[0]);
    const [name, setName] = useState('');
    const [position, setPosition] = useState(POSITIONS[0]);
    const [selectedBank, setSelectedBank] = useState(BANK_NAMES_WITH_OTHER[0]);
    const [customBankName, setCustomBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [parkingDurationOption, setParkingDurationOption] = useState('4');
    const [customDuration, setCustomDuration] = useState('');
    const [hourlyRate, setHourlyRate] = useState(DEFAULT_HOURLY_RATE.toString());
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [allUserRecords, setAllUserRecords] = useState([]);
    const [nameSuggestions, setNameSuggestions] = useState([]);
    const [showNameSuggestions, setShowNameSuggestions] = useState(false);
    const [accountInfoSuggestions, setAccountInfoSuggestions] = useState([]);
    const [showAccountInfoSuggestions, setShowAccountInfoSuggestions] = useState(false);
  
    useEffect(() => {
      if (db && userId) {
        const fetchParkingRecords = async () => {
          try {
            const recordsRef = collection(db, `/artifacts/${firebaseConfig.appId}/public/data/parkingRecords`);
            const q = query(recordsRef);
            const querySnapshot = await getDocs(q);
            const records = [];
            querySnapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
  
            const latestUserRecords = {};
            records.forEach(record => {
              if (!latestUserRecords[record.name] || new Date(record.createdAt?.toDate() || record.parkingDate) > new Date(latestUserRecords[record.name].createdAt?.toDate() || latestUserRecords[record.name].parkingDate)) {
                latestUserRecords[record.name] = record;
              }
            });
            setAllUserRecords(Object.values(latestUserRecords));
          } catch (error) {
            console.error("주차 기록 로드 오류:", error);
            setDbError("주차 기록 로드 중 오류 발생: " + error.message);
          }
        };
        fetchParkingRecords();
      }
    }, [db, userId, setDbError]);
  
    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);
        if (value) {
            const suggestions = allUserRecords.filter(record => record.name.toLowerCase().includes(value.toLowerCase())).map(record => record.name).filter((v, i, a) => a.indexOf(v) === i);
            setNameSuggestions(suggestions.slice(0, 5));
            setShowNameSuggestions(true);
        } else {
            setShowNameSuggestions(false);
        }
    };

    const handleNameSuggestionClick = (suggestedName) => {
        setName(suggestedName);
        setShowNameSuggestions(false);
        const userRecord = allUserRecords.find(record => record.name === suggestedName);
        if (userRecord) {
            setPosition(userRecord.position || POSITIONS[0]);
            if (userRecord.accountInfo) {
                const [bank, accNum] = userRecord.accountInfo.split('/');
                if (BANK_NAMES_WITH_OTHER.includes(bank)) {
                    setSelectedBank(bank);
                    setCustomBankName('');
                } else {
                    setSelectedBank('기타');
                    setCustomBankName(bank || '');
                }
                setAccountNumber(accNum ? accNum.replace(/-/g, '') : '');
            }
        }
    };

    const handleAccountNumberChange = (e) => {
        const rawValue = e.target.value;
        const numericValue = rawValue.replace(/-/g, '');
        setAccountNumber(numericValue);
        if (numericValue) {
            const suggestions = allUserRecords.filter(record => {
                if (record.accountInfo) {
                    const existingAccNum = record.accountInfo.split('/')[1];
                    return existingAccNum && existingAccNum.replace(/-/g, '').includes(numericValue);
                }
                return false;
            }).map(record => record.accountInfo).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
            setAccountInfoSuggestions(suggestions);
            setShowAccountInfoSuggestions(true);
        } else {
            setShowAccountInfoSuggestions(false);
        }
    };

    const handleAccountInfoSuggestionClick = (suggestedAccountInfo) => {
        const [bank, accNum] = suggestedAccountInfo.split('/');
        if (BANK_NAMES_WITH_OTHER.includes(bank)) {
            setSelectedBank(bank);
            setCustomBankName('');
        } else {
            setSelectedBank('기타');
            setCustomBankName(bank || '');
        }
        setAccountNumber(accNum ? accNum.replace(/-/g, '') : '');
        setShowAccountInfoSuggestions(false);
        const userRecord = allUserRecords.find(record => record.accountInfo === suggestedAccountInfo);
        if (userRecord) {
            setName(userRecord.name);
            setPosition(userRecord.position || POSITIONS[0]);
        }
    };

    const getParkingDurationHours = () => {
        if (parkingDurationOption === 'custom') return parseFloat(customDuration) || 0;
        return parseInt(parkingDurationOption, 10);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId || !db) {
            setMessage({ type: 'error', text: '데이터베이스 연결이 준비되지 않았습니다.' });
            return;
        }
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        const durationHours = getParkingDurationHours();
        if (durationHours <= 0) {
            setMessage({ type: 'error', text: '유효한 주차 시간을 입력해주세요.' });
            setIsLoading(false);
            return;
        }
        const currentHourlyRate = parseFloat(hourlyRate) || DEFAULT_HOURLY_RATE;
        if (currentHourlyRate <= 0) {
            setMessage({ type: 'error', text: '유효한 시간당 주차 요금을 입력해주세요.' });
            setIsLoading(false);
            return;
        }
        const finalBankName = selectedBank === '기타' ? customBankName.trim() : selectedBank;
        if (selectedBank === '기타' && !finalBankName) {
            setMessage({ type: 'error', text: '기타 은행명을 입력해주세요.' });
            setIsLoading(false);
            return;
        }
        if (!accountNumber.trim()) {
            setMessage({ type: 'error', text: '계좌번호를 입력해주세요.' });
            setIsLoading(false);
            return;
        }
        const accountInfoString = `${finalBankName}/${accountNumber.trim()}`;
        const newRecord = {
            appId: firebaseConfig.appId, userId, parkingLocation, parkingDate, name: name.trim(), position, accountInfo: accountInfoString,
            parkingDurationHours: durationHours, isCustomDuration: parkingDurationOption === 'custom',
            customDurationDetail: parkingDurationOption === 'custom' ? customDuration : '',
            hourlyRate: currentHourlyRate, calculatedFee: durationHours * currentHourlyRate, createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, `/artifacts/${firebaseConfig.appId}/public/data/parkingRecords`), newRecord);
            setMessage({ type: 'success', text: '데이터가 성공적으로 저장되었습니다.' });

            setName('');
            setPosition(POSITIONS[0]);
            setSelectedBank(BANK_NAMES_WITH_OTHER[0]);
            setCustomBankName('');
            setAccountNumber('');
            setParkingDurationOption('4');
            setCustomDuration('');
            setHourlyRate(DEFAULT_HOURLY_RATE.toString());

        } catch (error) {
            console.error("데이터 저장 오류: ", error);
            setMessage({ type: 'error', text: `저장 오류: ${error.message}` });
            setDbError(`저장 오류: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-800 mb-12 text-center">주차 정보 입력</h1>
          {message.text && <div className={`p-4 rounded-xl mb-8 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>{message.text}</div>}
          <form onSubmit={handleSubmit} className="space-y-10" onClick={() => { setShowNameSuggestions(false); setShowAccountInfoSuggestions(false); }}>
            <FormItem icon={Building} label="주차 장소"><select value={parkingLocation} onChange={(e) => setParkingLocation(e.target.value)} className={formInputOneUI}>{PARKING_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></FormItem>
            <FormItem icon={CalendarDays} label="주차 날짜"><input type="date" value={parkingDate} onChange={(e) => setParkingDate(e.target.value)} className={formInputOneUI} required /></FormItem>
            <div className="relative">
              <FormItem icon={UserCircle} label="이름">
                <input type="text" value={name} onChange={handleNameChange} onClick={(e) => e.stopPropagation()} placeholder="이름을 입력하세요" className={formInputOneUI} required />
              </FormItem>
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border-2 border-slate-200 rounded-xl mt-1.5 max-h-56 overflow-y-auto shadow-xl">
                  {nameSuggestions.map((suggestion, index) => (
                    <li key={index} onClick={() => handleNameSuggestionClick(suggestion)} className="px-6 py-3.5 hover:bg-slate-100 cursor-pointer text-base text-slate-700">{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
            <FormItem icon={Users} label="직분"><select value={position} onChange={(e) => setPosition(e.target.value)} className={formInputOneUI}>{POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></FormItem>
            <FormItem icon={Banknote} label="계좌 정보">
              <div className="space-y-6">
                <div><label htmlFor="bankName" className="block text-sm font-medium text-slate-600 mb-2">은행명</label><select id="bankName" value={selectedBank} onChange={(e) => { setSelectedBank(e.target.value); if (e.target.value !== '기타') setCustomBankName(''); }} className={formInputOneUI}>{BANK_NAMES_WITH_OTHER.map(bank => <option key={bank} value={bank}>{bank}</option>)}</select></div>
                {selectedBank === '기타' && <div><label htmlFor="customBankName" className="block text-sm font-medium text-slate-600 mb-2">은행명 직접 입력</label><input type="text" id="customBankName" value={customBankName} onChange={(e) => setCustomBankName(e.target.value)} placeholder="은행명을 입력하세요" className={formInputOneUI} required={selectedBank === '기타'} /></div>}
                <div className="relative">
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-600 mb-2">계좌번호</label>
                  <input type="text" id="accountNumber" value={accountNumber} onChange={handleAccountNumberChange} onClick={(e) => e.stopPropagation()} placeholder="계좌번호를 입력하세요 (-는 자동으로 제거됩니다)" className={formInputOneUI} required />
                  {showAccountInfoSuggestions && accountInfoSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border-2 border-slate-200 rounded-xl mt-1.5 max-h-56 overflow-y-auto shadow-xl">
                      {accountInfoSuggestions.map((suggestion, index) => (
                        <li key={index} onClick={() => handleAccountInfoSuggestionClick(suggestion)} className="px-6 py-3.5 hover:bg-slate-100 cursor-pointer text-base text-slate-700">{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </FormItem>
            <FormItem icon={Clock} label="주차 시간">
              <div className="flex items-center space-x-4">
                <select value={parkingDurationOption} onChange={(e) => setParkingDurationOption(e.target.value)} className={`${formInputOneUI} flex-grow`}>{Array.from({ length: 12 }, (_, i) => i + 1).map(hour => <option key={hour} value={hour.toString()}>{hour}시간</option>)}<option value="custom">기타 (직접 입력)</option></select>
                {parkingDurationOption === 'custom' && <input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} placeholder="시간" className={`${formInputOneUI} w-36`} min="0.1" step="0.1"/>}
              </div>
            </FormItem>
            <FormItem icon={DollarSign} label="시간당 주차 요금 (원)"><input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="예: 3000" className={formInputOneUI} min="0" required /></FormItem>
            <button type="submit" disabled={isLoading || !userId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300 text-lg mt-12">
                {isLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Save className="w-6 h-6 mr-3" />}
                {isLoading ? '저장 중...' : '정보 저장하기'}
            </button>
          </form>
        </div>
    );
}

// ==================================================================
// QueryPage 컴포넌트
// ==================================================================
function QueryPage({ db, userId, setDbError }) {
    const [searchName, setSearchName] = useState('');
    const [searchStartDate, setSearchStartDate] = useState('');
    const [searchEndDate, setSearchEndDate] = useState('');
    const [searchParkingLocation, setSearchParkingLocation] = useState(ALL_LOCATIONS_VALUE);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalFee, setTotalFee] = useState(0);
    const [nameAccountTotals, setNameAccountTotals] = useState({});
    const [message, setMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
    const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [copied, setCopied] = useState(false);
    const [periodTopLocation, setPeriodTopLocation] = useState('');
    const [individualTopLocation, setIndividualTopLocation] = useState('');
    const [recordingSession, setRecordingSession] = useState(null);
    const [completedSessions, setCompletedSessions] = useState([]);
  
    const handleSearch = useCallback(async (searchParams = {}) => {
      if (!userId || !db) {
        setMessage('데이터베이스 연결이 준비되지 않았습니다.');
        return;
      }
      setIsLoading(true);
      setMessage('');
      setDeleteMessage({ type: '', text: '' });
  
      const { name = searchName, startDate = searchStartDate, endDate = searchEndDate, location = searchParkingLocation } = searchParams;
  
      try {
        const parkingRecordsRef = collection(db, `/artifacts/${firebaseConfig.appId}/public/data/parkingRecords`);
        let q = query(parkingRecordsRef);
  
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          q = query(q, where("createdAt", ">=", start));
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          q = query(q, where("createdAt", "<=", end));
        }
        if (location && location !== ALL_LOCATIONS_VALUE) {
          q = query(q, where("parkingLocation", "==", location));
        }
        if (name.trim()) {
          q = query(q, where("name", "==", name.trim()));
        }
  
        const querySnapshot = await getDocs(q);
        const fetchedRecords = [];
        querySnapshot.forEach((doc) => fetchedRecords.push({ id: doc.id, ...doc.data() }));
  
        const sortedDetailedResults = [...fetchedRecords].sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(a.parkingDate);
          const dateB = b.createdAt?.toDate() || new Date(b.parkingDate);
          const nameCompare = a.name.localeCompare(b.name, 'ko-KR');
          if (nameCompare !== 0) return nameCompare;
          return dateB - dateA;
        });
        setResults(sortedDetailedResults);
  
        const currentNameAccountTotals = fetchedRecords.reduce((acc, record) => {
          const key = `${record.name} | ${record.accountInfo}`;
          if (!acc[key]) {
            acc[key] = { name: record.name, accountInfo: record.accountInfo, totalFee: 0 };
          }
          acc[key].totalFee += (record.calculatedFee || 0);
          return acc;
        }, {});
        setNameAccountTotals(currentNameAccountTotals);
  
        let currentTotalFee = 0;
        fetchedRecords.forEach(record => currentTotalFee += (record.calculatedFee || 0));
        setTotalFee(currentTotalFee);
  
        setPeriodTopLocation(getTopParkingLocationsHelper(fetchedRecords));
        if (name.trim()) {
          const userSpecificRecords = fetchedRecords.filter(r => r.name === name.trim());
          setIndividualTopLocation(getTopParkingLocationsHelper(userSpecificRecords));
        } else {
          setIndividualTopLocation('');
        }
  
        if (fetchedRecords.length === 0) setMessage('검색 결과가 없습니다.');
      } catch (error) {
        console.error("데이터 조회 오류: ", error);
        setMessage(`조회 오류: ${error.message}`);
        setDbError(error.message);
      } finally {
        setIsLoading(false);
      }
    }, [userId, db, searchName, searchStartDate, searchEndDate, searchParkingLocation, setDbError]);
    
    useEffect(() => {
        const savedSession = localStorage.getItem('parkingRecordingSession');
        if (savedSession) setRecordingSession(JSON.parse(savedSession));
        
        const savedCompletedSessions = localStorage.getItem('completedParkingSessions');
        if (savedCompletedSessions) setCompletedSessions(JSON.parse(savedCompletedSessions));
    }, []);

    const handleStartRecording = () => {
        const startTime = new Date().toISOString();
        const session = { id: Date.now(), startTime };
        localStorage.setItem('parkingRecordingSession', JSON.stringify(session));
        setRecordingSession(session);
        setMessage(`기록이 시작되었습니다: ${new Date(startTime).toLocaleString()}`);
    };

    const handleStopRecording = () => {
        if (recordingSession) {
            const endTime = new Date().toISOString();
            const newCompletedSession = { ...recordingSession, endTime };
            
            const updatedCompletedSessions = [newCompletedSession, ...completedSessions];
            setCompletedSessions(updatedCompletedSessions);
            localStorage.setItem('completedParkingSessions', JSON.stringify(updatedCompletedSessions));
            
            localStorage.removeItem('parkingRecordingSession');
            setRecordingSession(null);
            
            const start = newCompletedSession.startTime;
            const end = newCompletedSession.endTime;
            setSearchStartDate(start);
            setSearchEndDate(end);
            setMessage(`기록이 중단되었습니다. 기간이 자동으로 설정되었습니다.`);
            
            handleSearch({startDate: start, endDate: end});
        }
    };
    
    const handleSessionClick = (session) => {
        const start = session.startTime;
        const end = session.endTime;
        setSearchStartDate(start);
        setSearchEndDate(end);
        handleSearch({ startDate: start, endDate: end });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

    const getTopParkingLocationsHelper = (records, count = 1) => {
        if (!records || records.length === 0) return '데이터 없음';
        const locationCounts = records.reduce((acc, record) => {
            acc[record.parkingLocation] = (acc[record.parkingLocation] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(locationCounts).sort(([, a], [, b]) => b - a).slice(0, count).map(([location, num]) => `${location} (${num}건)`).join(', ');
    };

    const getTopParkersByFee = (totals, count = 3) => {
        return Object.values(totals).sort((a, b) => b.totalFee - a.totalFee).slice(0, count).map(item => `${item.name} (${formatCurrency(item.totalFee)})`).join(', ');
    };

    const handleAiAnalysis = async () => {
        if (results.length === 0) {
          setAiError("분석할 데이터가 없습니다. 먼저 데이터를 검색해주세요.");
          setShowAiSummaryModal(true); return;
        }
        if (!geminiApiKey) {
          setAiError("AI 분석을 위한 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
          setShowAiSummaryModal(true); return;
        }
        setIsAiLoading(true); setAiSummary(''); setAiError(''); setShowAiSummaryModal(true);
    
        const topParkers = getTopParkersByFee(nameAccountTotals);
        
        let prompt = `...`; // Prompt ommited for brevity

        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
    
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`AI 분석 서비스 호출 실패: ${errorData.error?.message || response.statusText}`);
          }
    
          const result = await response.json();
          if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            setAiSummary(result.candidates[0].content.parts[0].text);
          } else {
            throw new Error("AI 분석 결과를 가져오지 못했습니다.");
          }
        } catch (error) {
          console.error("AI 분석 오류:", error);
          setAiError(`AI 분석 중 오류 발생: ${error.message}`);
        } finally {
          setIsAiLoading(false);
        }
    };
  
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            setAiError('클립보드 복사에 실패했습니다.');
        });
    };

    const escapeCsvCell = (cellData) => {
        if (cellData == null) return '';
        const stringData = String(cellData);
        if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n') || stringData.includes('\r')) {
            return `"${stringData.replace(/"/g, '""')}"`;
        }
        return stringData;
    };

    const downloadExcel = () => {
        if (results.length === 0) {
            setMessage("다운로드할 데이터가 없습니다."); return;
        }
        const headers = ["날짜", "이름", "직분", "주차장소", "주차시간(시간)", "시간당요금(원)", "계산된요금(원)", "계좌정보"];
        let csvContent = "\uFEFF" + headers.join(",") + "\r\n";
        results.forEach(record => {
            const row = [ record.parkingDate, record.name, record.position, record.parkingLocation, record.parkingDurationHours + (record.isCustomDuration ? ` (${record.customDurationDetail})` : ''), record.hourlyRate, record.calculatedFee, record.accountInfo ].map(escapeCsvCell).join(",");
            csvContent += row + "\r\n";
        });
        csvContent += "\r\n";
        csvContent += `총 주차비용 합계:,${escapeCsvCell(formatCurrency(totalFee))}\r\n\r\n`;
        if (Object.keys(nameAccountTotals).length > 0) {
            csvContent += "이름,계좌정보,해당 기간 주차비 합계\r\n";
            Object.values(nameAccountTotals)
                .sort((a,b) => a.name.localeCompare(b.name, 'ko-KR') || a.accountInfo.localeCompare(b.accountInfo))
                .forEach(data => {
                    const row = [data.name, data.accountInfo, data.totalFee].map(escapeCsvCell).join(",");
                    csvContent += row + "\r\n";
                });
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `주차정산내역_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAttempt = (recordId) => {
        setItemToDelete(recordId); setShowDeleteModal(true); setDeleteMessage({ type: '', text: '' });
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !db) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `/artifacts/${firebaseConfig.appId}/public/data/parkingRecords`, itemToDelete));
            setDeleteMessage({ type: 'success', text: '항목이 성공적으로 삭제되었습니다.'});
            await handleSearch({startDate: searchStartDate, endDate: searchEndDate, name: searchName, location: searchParkingLocation});
            setShowDeleteModal(false);
        } catch (error) {
            console.error("데이터 삭제 오류: ", error);
            setDeleteMessage({ type: 'error', text: `삭제 오류: ${error.message}` });
            setDbError(`삭제 오류: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-12">
          {/* ... JSX for QueryPage's search form, results, modals etc. */}
        </div>
    );
}

// ==================================================================
// App 컴포넌트 (최종 조립)
// ==================================================================
function App() {
  const [currentPage, setCurrentPage] = useState('entry');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setAuthError("Firebase Auth 서비스 초기화 실패");
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogout = () => signOut(auth);
  
  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  if (!userId) {
    return <LoginPage />;
  }
  
  const navigationButtons = (
    <nav className="flex items-center space-x-2">
        <button onClick={() => setCurrentPage('entry')} className={`flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'entry' ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:ring-blue-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400'}`}>
            <FileText className="w-4 h-4 mr-2" />입력
        </button>
        <button onClick={() => setCurrentPage('query')} className={`flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'query' ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:ring-blue-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400'}`}>
            <Search className="w-4 h-4 mr-2" />조회
        </button>
        <button onClick={handleLogout} title="로그아웃" className="px-3 py-3 rounded-lg text-sm font-semibold bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400">
            <Info />
        </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center text-2xl font-bold text-slate-800">
                  <Building className="w-7 h-7 mr-3 text-blue-600" />교회 주차 정산
              </div>
              {navigationButtons}
          </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow w-full">
        {dbError && 
            <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg shadow-md max-w-4xl mx-auto text-center">
                <strong>데이터베이스 오류</strong>
                <p className="mt-1 text-sm">{dbError}</p>
            </div>
        }
        {currentPage === 'entry' && <EntryForm db={db} userId={userId} setDbError={setDbError} />}
        {currentPage === 'query' && <QueryPage db={db} userId={userId} setDbError={setDbError} />}
      </main>
      <footer className="text-center py-4 text-xs text-slate-500 bg-slate-200">
        <p>© {new Date().getFullYear()} 교회 주차 관리 시스템.</p>
        <p className="font-mono text-slate-600 mt-1">App ID: {firebaseConfig.appId || 'Loading...'}</p>
      </footer>
    </div>
  );
}


export default App;
