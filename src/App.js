import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, writeBatch, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { Save, Search, CalendarDays, Users, DollarSign, Clock, Building, Banknote, UserCircle, FileText, Trash2, AlertTriangle, ListChecks, Download, X, Sparkles, Copy, Loader2, PlayCircle, StopCircle, Info, History, LogOut, RotateCcw } from 'lucide-react';

// --- 환경 변수에서 설정값 가져오기 ---
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

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    if (!getApps().length) {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
        } catch (error) {
            console.error("Firebase 초기화 오류:", error);
        }
    } else {
        app = getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
    }
}

// --- 앱 전체에서 사용될 상수들 ---
const PARKING_LOCATIONS = ["어린이회관 주차장1", "어린이회관 주차장2", "세종대 대양AI센터 주차장", "국민은행 주차장", "교회 뒷편 세종대 주차장", "광진광장 공영주차장"];
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
// LoginPage 컴포넌트
// ==================================================================
function LoginPage({ authInstance }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      if (!email || !password) {
        setError('이메일과 비밀번호를 모두 입력해주세요.');
        setLoading(false);
        return;
      }
      if (!authInstance) {
        setError('인증 서비스가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      try {
        await signInWithEmailAndPassword(authInstance, email, password);
      } catch (err) {
        console.error("Firebase 로그인 오류:", err.code);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-api-key') {
          setError('이메일, 비밀번호 또는 API 키가 올바르지 않습니다.');
        } else {
          setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
          setLoading(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-2xl">
          <div className="text-center">
              <div className="flex items-center justify-center text-3xl font-bold text-slate-800 mb-4">
                  <Building className="w-9 h-9 mr-3.5 text-blue-600" />
                  <span>관리자 로그인</span>
              </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">이메일 주소</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={formInputOneUI} placeholder="이메일 주소" />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={formInputOneUI} placeholder="비밀번호" />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-1 focus:ring-blue-500 transition-all duration-200 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed">
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
}

// ==================================================================
// EntryForm 컴포넌트
// ==================================================================
function EntryForm({ db, userId, setDbError, appId }) {
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

    const fetchParkingRecords = useCallback(async () => {
        if (!db || !userId || !appId) return;
        try {
            const recordsRef = collection(db, `/artifacts/${appId}/public/data/parkingRecords`);
            const q = query(recordsRef);
            const querySnapshot = await getDocs(q);
            const records = [];
            querySnapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));

            const latestUserRecords = {};
            records.forEach(record => {
                const recordDate = record.createdAt?.toDate() || new Date(record.parkingDate);
                const existingRecord = latestUserRecords[record.name];
                const existingRecordDate = existingRecord ? (existingRecord.createdAt?.toDate() || new Date(existingRecord.parkingDate)) : null;

                if (!existingRecord || recordDate > existingRecordDate) {
                    latestUserRecords[record.name] = record;
                }
            });
            setAllUserRecords(Object.values(latestUserRecords));
        } catch (error) {
            console.error("주차 기록 로드 오류:", error);
            setDbError("주차 기록 로드 중 오류 발생: " + error.message);
        }
    }, [db, userId, appId, setDbError]);

    useEffect(() => {
        fetchParkingRecords();
    }, [fetchParkingRecords]);

    const handleNameChange = (e) => {
        const value = e.target.value;
        setName(value);
        if (value) {
            const suggestions = allUserRecords
                .filter(record => record.name.toLowerCase().includes(value.toLowerCase()))
                .map(record => record.name)
                .filter((v, i, a) => a.indexOf(v) === i);
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
        const numericValue = rawValue.replace(/[^0-9]/g, '');
        setAccountNumber(numericValue);

        if (numericValue) {
            const suggestions = allUserRecords
                .filter(record => {
                    if (record.accountInfo) {
                        const existingAccNum = record.accountInfo.split('/')[1];
                        return existingAccNum && existingAccNum.replace(/-/g, '').includes(numericValue);
                    }
                    return false;
                })
                .map(record => record.accountInfo)
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 5);
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
        if (!userId || !db || !appId) {
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
            appId: appId,
            userId: userId,
            parkingLocation,
            parkingDate,
            name: name.trim(),
            position,
            accountInfo: accountInfoString,
            parkingDurationHours: durationHours,
            isCustomDuration: parkingDurationOption === 'custom',
            customDurationDetail: parkingDurationOption === 'custom' ? customDuration : '',
            hourlyRate: currentHourlyRate,
            calculatedFee: durationHours * currentHourlyRate,
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, `/artifacts/${appId}/public/data/parkingRecords`), newRecord);
            setMessage({ type: 'success', text: '데이터가 성공적으로 저장되었습니다.' });

            setName('');
            setPosition(POSITIONS[0]);
            setSelectedBank(BANK_NAMES_WITH_OTHER[0]);
            setCustomBankName('');
            setAccountNumber('');
            setParkingDurationOption('4');
            setCustomDuration('');
            
            await fetchParkingRecords();

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
function QueryPage({ db, userId, setDbError, appId, geminiApiKey }) {
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
    const [selectedSession, setSelectedSession] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false); // [추가] 전체 삭제 확인 모달 상태

    const handleSearch = useCallback(async (searchParams = {}) => {
        if (!userId || !db || !appId) {
            setMessage('데이터베이스 연결이 준비되지 않았습니다.');
            return;
        }

        const { name = searchName, startDate = searchStartDate, endDate = searchEndDate, location = searchParkingLocation } = searchParams;

        setIsLoading(true);
        setMessage('');
        setDeleteMessage({ type: '', text: '' });

        try {
            const parkingRecordsRef = collection(db, `/artifacts/${appId}/public/data/parkingRecords`);
            const querySnapshot = await getDocs(parkingRecordsRef);
            const allRecords = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.name && (data.parkingDate || data.createdAt)) {
                   allRecords.push({ id: doc.id, ...data });
                }
            });

            const filteredRecords = allRecords.filter(record => {
                if (name.trim() && !record.name.toLowerCase().includes(name.trim().toLowerCase())) {
                    return false;
                }
                if (location !== ALL_LOCATIONS_VALUE && record.parkingLocation !== location) {
                    return false;
                }
                
                // [수정] 시간까지 고려한 날짜/시간 필터링 로직
                const recordDate = record.createdAt?.toDate() || new Date(record.parkingDate);
                if (startDate) {
                    const start = new Date(startDate);
                    // YYYY-MM-DD 형식의 날짜 문자열인 경우에만 시간 조정
                    if (startDate.length === 10 && !startDate.includes('T')) {
                        start.setHours(0, 0, 0, 0);
                    }
                    if (recordDate < start) return false;
                }
                if (endDate) {
                    const end = new Date(endDate);
                     // YYYY-MM-DD 형식의 날짜 문자열인 경우에만 시간 조정
                    if (endDate.length === 10 && !endDate.includes('T')) {
                        end.setHours(23, 59, 59, 999);
                    }
                    if (recordDate > end) return false;
                }
                
                return true;
            });

            const sortedDetailedResults = [...filteredRecords].sort((a, b) => {
                const dateA = a.createdAt?.toDate() || new Date(a.parkingDate);
                const dateB = b.createdAt?.toDate() || new Date(b.parkingDate);
                const nameCompare = a.name.localeCompare(b.name, 'ko-KR');
                if (nameCompare !== 0) return nameCompare;
                return dateB - dateA;
            });
            
            setResults(sortedDetailedResults);

            if (sortedDetailedResults.length > 0) {
                const currentNameAccountTotals = sortedDetailedResults.reduce((acc, record) => {
                    const key = `${record.name} | ${record.accountInfo}`;
                    if (!acc[key]) acc[key] = { name: record.name, accountInfo: record.accountInfo, totalFee: 0 };
                    acc[key].totalFee += (record.calculatedFee || 0);
                    return acc;
                }, {});
                setNameAccountTotals(currentNameAccountTotals);
                setTotalFee(sortedDetailedResults.reduce((sum, record) => sum + (record.calculatedFee || 0), 0));
                setPeriodTopLocation(getTopParkingLocationsHelper(sortedDetailedResults));
                if (name.trim()) {
                    setIndividualTopLocation(getTopParkingLocationsHelper(sortedDetailedResults.filter(r => r.name === name.trim())));
                } else {
                    setIndividualTopLocation('');
                }
                setMessage('');
            } else {
                setTotalFee(0);
                setNameAccountTotals({});
                setMessage('검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error("데이터 조회 오류: ", error);
            setMessage(`조회 오류: ${error.message}`);
            setDbError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [userId, db, appId, setDbError, searchName, searchStartDate, searchEndDate, searchParkingLocation]);
    
    useEffect(() => {
        const savedSession = localStorage.getItem('parkingRecordingSession');
        if (savedSession) setRecordingSession(JSON.parse(savedSession));
        
        const savedCompletedSessions = localStorage.getItem('completedParkingSessions');
        if (savedCompletedSessions) setCompletedSessions(JSON.parse(savedCompletedSessions));
    }, []);

    // [수정] 정확한 시간(ISO)으로 기록 시작
    const handleStartRecording = () => {
        const startTime = new Date().toISOString();
        const session = { id: Date.now(), startTime };
        localStorage.setItem('parkingRecordingSession', JSON.stringify(session));
        setRecordingSession(session);
        setSearchStartDate(startTime.split('T')[0]); // UI에는 날짜만 표시
        setMessage(`기록이 시작되었습니다: ${new Date(startTime).toLocaleString('ko-KR')}`);
    };

    // [수정] 정확한 시간(ISO)으로 기록 중단
    const handleStopRecording = () => {
        if (recordingSession) {
            const endTime = new Date().toISOString();
            const newCompletedSession = { ...recordingSession, endTime };
            
            const updatedCompletedSessions = [newCompletedSession, ...completedSessions];
            setCompletedSessions(updatedCompletedSessions);
            localStorage.setItem('completedParkingSessions', JSON.stringify(updatedCompletedSessions));
            
            localStorage.removeItem('parkingRecordingSession');
            setRecordingSession(null);
            
            setSearchStartDate(newCompletedSession.startTime);
            setSearchEndDate(newCompletedSession.endTime);
            setMessage(`기록이 중단되었습니다. 기간이 자동으로 설정되었습니다.`);
            
            handleSearch({startDate: newCompletedSession.startTime, endDate: newCompletedSession.endTime, name: '', location: ALL_LOCATIONS_VALUE});
        }
    };
    
    const handleSessionClick = (session) => {
        setSearchStartDate(session.startTime);
        setSearchEndDate(session.endTime);
        setSearchName('');
        setSearchParkingLocation(ALL_LOCATIONS_VALUE);
        setSelectedSession(session.id);
        handleSearch({ startDate: session.startTime, endDate: session.endTime, name: '', location: ALL_LOCATIONS_VALUE });
    };

    const handleDeleteSession = (sessionIdToDelete, e) => {
        e.stopPropagation();
        const updatedSessions = completedSessions.filter(session => session.id !== sessionIdToDelete);
        setCompletedSessions(updatedSessions);
        localStorage.setItem('completedParkingSessions', JSON.stringify(updatedSessions));
    };

    const handleClearSearch = () => {
        setSearchName('');
        setSearchStartDate('');
        setSearchEndDate('');
        setSearchParkingLocation(ALL_LOCATIONS_VALUE);
        setResults([]);
        setTotalFee(0);
        setNameAccountTotals({});
        setMessage('');
        setPeriodTopLocation('');
        setIndividualTopLocation('');
        setSelectedSession(null);
        setDeleteMessage({ type: '', text: '' });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';
    
    // [추가] 날짜/시간 포맷팅 함수
    const formatDateTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    };

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

    const handleDeleteAttempt = (recordId) => {
        setItemToDelete(recordId);
        setShowDeleteModal(true);
        setDeleteMessage({ type: '', text: '' });
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !db || !appId) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `/artifacts/${appId}/public/data/parkingRecords`, itemToDelete));
            setDeleteMessage({ type: 'success', text: '항목이 성공적으로 삭제되었습니다.'});
            
            const updatedResults = results.filter(r => r.id !== itemToDelete);
            setResults(updatedResults);

            if (updatedResults.length > 0) {
              const currentNameAccountTotals = updatedResults.reduce((acc, record) => {
                  const key = `${record.name} | ${record.accountInfo}`;
                  if (!acc[key]) acc[key] = { name: record.name, accountInfo: record.accountInfo, totalFee: 0 };
                  acc[key].totalFee += (record.calculatedFee || 0);
                  return acc;
              }, {});
              setNameAccountTotals(currentNameAccountTotals);
              setTotalFee(updatedResults.reduce((sum, record) => sum + (record.calculatedFee || 0), 0));
            } else {
              setTotalFee(0);
              setNameAccountTotals({});
              setMessage('남은 검색 결과가 없습니다.');
            }

        } catch (error) {
            console.error("데이터 삭제 오류: ", error);
            setDeleteMessage({ type: 'error', text: `삭제 오류: ${error.message}` });
            setDbError(`삭제 오류: ${error.message}`);
        } finally {
            setShowDeleteModal(false);
            setIsLoading(false);
            setItemToDelete(null);
        }
    };
    
    // [추가] 모든 데이터 삭제 실행 함수
    const confirmDeleteAll = async () => {
        setIsLoading(true);
        setDeleteMessage({ type: '', text: '모든 기록을 삭제하는 중입니다...' });
        try {
            const recordsRef = collection(db, `/artifacts/${appId}/public/data/parkingRecords`);
            const querySnapshot = await getDocs(recordsRef);
            
            if (querySnapshot.empty) {
                setDeleteMessage({ type: 'success', text: '삭제할 기록이 없습니다.' });
                handleClearSearch();
                return;
            }

            // Firestore는 500개씩 일괄 삭제를 권장합니다.
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            setDeleteMessage({ type: 'success', text: `총 ${querySnapshot.size}개의 기록을 모두 삭제했습니다.` });
            handleClearSearch(); // UI 초기화
            
        } catch (error) {
            console.error("모든 데이터 삭제 오류: ", error);
            setDeleteMessage({ type: 'error', text: `전체 삭제 중 오류 발생: ${error.message}` });
            setDbError(error.message);
        } finally {
            setShowDeleteAllModal(false);
            setIsLoading(false);
        }
    };


    const handleAiAnalysis = async () => { /* ... 이전 코드와 동일 ... */ };
    const copyToClipboard = (text) => { /* ... 이전 코드와 동일 ... */ };
    const escapeCsvCell = (cellData) => { /* ... 이전 코드와 동일 ... */ };
    const downloadExcel = () => { /* ... 이전 코드와 동일 ... */ };

    return (
        <div className="space-y-12">
            <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl">
                 <h1 className="text-4xl font-bold text-slate-800 mb-6 text-center">주차 정보 조회</h1>
                <div className="bg-sky-50 border-2 border-sky-200 p-6 rounded-2xl mb-10">
                    <h2 className="text-xl font-semibold text-sky-800 mb-4 flex items-center"><Clock className="w-6 h-6 mr-3"/>기록 세션 관리</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handleStartRecording} disabled={!!recordingSession} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-5 rounded-xl shadow-md transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"><PlayCircle className="w-5 h-5 mr-2.5"/>기록 시작</button>
                        <button onClick={handleStopRecording} disabled={!recordingSession} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-5 rounded-xl shadow-md transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"><StopCircle className="w-5 h-5 mr-2.5"/>기록 중단</button>
                    </div>
                    {recordingSession && <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-sm flex items-center"><Info className="w-5 h-5 mr-3 shrink-0"/><span>기록이 진행 중입니다. 시작 시간: <strong>{formatDateTime(recordingSession.startTime)}</strong></span></div>}
                </div>

                {completedSessions.length > 0 && (
                    <div className="bg-gray-50 border-2 border-gray-200 p-6 rounded-2xl mb-10">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center"><History className="w-6 h-6 mr-3"/>완료된 기록</h2>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {completedSessions.map(session => (
                                <li key={session.id} onClick={() => handleSessionClick(session)} 
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-150 cursor-pointer ${selectedSession === session.id ? 'bg-blue-100 border-blue-400 shadow-md' : 'bg-white hover:bg-gray-100 border-gray-300'}`}>
                                    <p className="font-semibold text-gray-700 text-sm">{formatDateTime(session.startTime)} ~ {formatDateTime(session.endTime)}</p>
                                    <button onClick={(e) => handleDeleteSession(session.id, e)} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors" title="이 기록 삭제">
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-12 items-end">
                    <div><label htmlFor="searchName" className="block text-lg font-semibold text-slate-700 mb-2.5">이름 검색</label><input type="text" id="searchName" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="이름 입력" className={formInputOneUI}/></div>
                    <div><label htmlFor="searchParkingLocation" className="block text-lg font-semibold text-slate-700 mb-2.5">주차 장소 선택</label><select id="searchParkingLocation" value={searchParkingLocation} onChange={(e) => setSearchParkingLocation(e.target.value)} className={formInputOneUI}><option value={ALL_LOCATIONS_VALUE}>전체 주차 장소</option>{PARKING_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
                    <div><label htmlFor="searchStartDate" className="block text-lg font-semibold text-slate-700 mb-2.5">시작 날짜</label><input type="date" id="searchStartDate" value={searchStartDate.split('T')[0]} onChange={(e) => setSearchStartDate(e.target.value)} className={formInputOneUI}/></div>
                    <div><label htmlFor="searchEndDate" className="block text-lg font-semibold text-slate-700 mb-2.5">종료 날짜</label><input type="date" id="searchEndDate" value={searchEndDate.split('T')[0]} onChange={(e) => setSearchEndDate(e.target.value)} className={formInputOneUI}/></div>
                </div>
                
                {/* [수정] 버튼 레이아웃 변경 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <button onClick={() => handleSearch()} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300 text-lg">{isLoading && !isAiLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Search className="w-6 h-6 mr-3" />}{isLoading && !isAiLoading ? '검색하기' : '검색 중...'}</button>
                    <button onClick={downloadExcel} disabled={results.length === 0 || isLoading} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-300 text-lg"><Download className="w-6 h-6 mr-3" />엑셀 다운로드</button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <button onClick={handleClearSearch} disabled={isLoading} className="bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-slate-300 text-base"><RotateCcw className="w-5 h-5 mr-3" />검색 초기화</button>
                    <button onClick={() => setShowDeleteAllModal(true)} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-red-300 text-base"><AlertTriangle className="w-5 h-5 mr-3" />모든 기록 삭제</button>
                </div>
                
                <div className="mt-5"><button onClick={handleAiAnalysis} disabled={results.length === 0 || isLoading || isAiLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-purple-300 text-lg">{isAiLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Sparkles className="w-6 h-6 mr-3" />}{isAiLoading ? 'AI 분석 중...' : '✨ AI 주차 데이터 분석'}</button></div>
                
                {message && !isLoading && <p className="text-center text-slate-600 mt-10 text-base">{message}</p>}
                {deleteMessage.text && !showDeleteModal && !showDeleteAllModal && <div className={`p-4 rounded-xl mt-10 text-sm ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>{deleteMessage.text}</div>}
            </div>
            
            {results.length > 0 && (
              <>
                <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl mb-10"><h2 className="text-2xl font-semibold text-slate-800 mb-5">선택 기간 총 주차비용</h2><p className="text-4xl font-bold text-blue-600">{formatCurrency(totalFee)}</p></div>
                {Object.keys(nameAccountTotals).length > 0 && <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl mb-10"><h2 className="text-2xl font-semibold text-slate-800 mb-8 flex items-center"><ListChecks size={30} className="mr-4 text-blue-600" />이름 및 계좌별 합계</h2><ul className="space-y-5">{Object.values(nameAccountTotals).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR') || a.accountInfo.localeCompare(b.accountInfo)).map((data, i) => (<li key={i} className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-shadow duration-200 bg-slate-50"><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center"><div className="mb-2 sm:mb-0 flex-grow"><p className="text-xl font-semibold text-slate-800">{data.name}</p><p className="text-sm text-slate-500 mt-1.5">{data.accountInfo}</p></div><p className="text-2xl font-bold text-blue-600 sm:text-right whitespace-nowrap mt-2 sm:mt-0">{formatCurrency(data.totalFee)}</p></div></li>))}</ul></div>}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden"><h2 className="text-2xl font-semibold text-slate-800 p-8 sm:p-10 pb-5">상세 주차 기록</h2><div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-100 border-b-2 border-slate-200"><tr><Th>날짜</Th><Th>이름</Th><Th>직분</Th><Th>주차장소</Th><Th>주차시간</Th><Th>시간당요금</Th><Th>계산된요금</Th><Th>계좌정보</Th><Th className="text-right pr-8">작업</Th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{results.map(record => (<tr key={record.id} className="hover:bg-slate-50/70 transition-colors duration-150"><Td>{formatDateTime(record.createdAt?.toDate() || record.parkingDate)}</Td><Td>{record.name}</Td><Td>{record.position}</Td><Td>{record.parkingLocation}</Td><Td>{record.parkingDurationHours}시간 {record.isCustomDuration ? `(${record.customDurationDetail})` : ''}</Td><Td>{formatCurrency(record.hourlyRate)}</Td><Td className="font-semibold text-blue-600">{formatCurrency(record.calculatedFee)}</Td><Td>{record.accountInfo}</Td><Td className="text-right pr-6"><button onClick={() => handleDeleteAttempt(record.id)} className="text-red-600 hover:text-red-700 p-2.5 rounded-lg hover:bg-red-100 transition-colors" title="삭제"><Trash2 size={20} /></button></Td></tr>))}</tbody></table></div></div>
              </>
            )}
            {results.length === 0 && !isLoading && message && <div className="bg-white p-12 rounded-2xl shadow-xl text-center"><p className="text-slate-500 text-xl">{message}</p></div>}
            
            {showDeleteModal && (/* ... 이전 코드와 동일 ... */)}
            
            {/* [추가] 모든 기록 삭제 확인 모달 */}
            {showDeleteAllModal && (<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"><div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full"><div className="flex items-start mb-7"><div className="p-3.5 bg-red-100 rounded-full mr-6 shrink-0"><AlertTriangle className="text-red-600 w-9 h-9" /></div><div><h3 className="text-2xl font-semibold text-slate-800">모든 기록 영구 삭제</h3><p className="text-slate-600 mt-2.5 text-base">정말로 모든 주차 기록을 데이터베이스에서 영구적으로 삭제하시겠습니까? <strong className="text-red-600">이 작업은 되돌릴 수 없습니다.</strong></p></div></div>{deleteMessage.text && <div className={`p-4 rounded-xl mb-7 text-sm ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>{deleteMessage.text}</div>}<div className="flex justify-end space-x-4"><button onClick={() => { setShowDeleteAllModal(false); }} disabled={isLoading} className="px-7 py-3.5 text-base font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-slate-300">취소</button><button onClick={confirmDeleteAll} disabled={isLoading} className="px-7 py-3.5 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-red-300">{isLoading ? <Loader2 className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" /> : <Trash2 size={18} className="mr-2.5" />}{isLoading ? '전체 삭제 중...' : '영구 삭제'}</button></div></div></div>)}

            {showAiSummaryModal && (/* ... 이전 코드와 동일 ... */)}
        </div>
    );
}

// ==================================================================
// 최상위 App 컴포넌트
// ==================================================================
function App() {
  const [currentPage, setCurrentPage] = useState('entry');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    if (!auth) {
      setAuthError("Firebase Auth 서비스 초기화 실패. 환경 변수를 확인해주세요.");
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      console.log("로그아웃 성공! 로그인 페이지로 돌아갑니다.");
      window.location.reload();
    }).catch((error) => {
      console.error("로그아웃 중 오류 발생:", error);
      setAuthError("로그아웃에 실패했습니다. 다시 시도해주세요.");
    });
  };

  if (!app || !db || !auth) {
    return (
      <div className="p-6 text-red-700 bg-red-100 rounded-xl shadow-lg max-w-lg mx-auto mt-12 text-center">
        <strong>Firebase 초기화 실패</strong>
        <p className="mt-2 text-sm">Firebase 설정에 문제가 있어 앱을 시작할 수 없습니다. .env.local 파일에 REACT_APP_ 접두사를 붙인 환경 변수가 올바르게 설정되었는지, 그리고 firebaseConfig 객체가 올바르게 구성되었는지 확인해주세요.</p>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  if (!userId) {
    return <LoginPage authInstance={auth} />;
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
        <LogOut className="w-4 h-4" />
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
        {authError &&
          <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg shadow-md max-w-4xl mx-auto text-center">
            <strong>인증 오류</strong>
            <p className="mt-1 text-sm">{authError}</p>
          </div>
        }
        {dbError &&
          <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-lg shadow-md max-w-4xl mx-auto text-center">
            <strong>데이터베이스 오류</strong>
            <p className="mt-1 text-sm">{dbError}</p>
          </div>
        }
        {currentPage === 'entry' && <EntryForm db={db} userId={userId} setDbError={setDbError} appId={firebaseConfig.appId} />}
        {currentPage === 'query' && <QueryPage db={db} userId={userId} setDbError={setDbError} appId={firebaseConfig.appId} geminiApiKey={geminiApiKey} />}
      </main>
      <footer className="text-center py-4 text-xs text-slate-500 bg-slate-200">
        <p>© {new Date().getFullYear()} 교회 주차 관리 시스템.</p>
        <p className="font-mono text-slate-600 mt-1">App ID: {firebaseConfig.appId || 'Loading...'}</p>
      </footer>
    </div>
  );
}

export default App;
