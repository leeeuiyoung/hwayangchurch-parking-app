import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, setLogLevel, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Save, Search, CalendarDays, Users, DollarSign, Clock, Building, Banknote, UserCircle, FileText, Trash2, AlertTriangle, ListChecks, Download, X, Sparkles, Copy, Loader2 } from 'lucide-react';

// --- 최종 테스트를 위해 Firebase 설정을 직접 코드에 입력합니다. ---
// 이 방법은 보안상 좋지 않지만, 문제의 원인을 확실히 찾기 위한 테스트입니다.
const firebaseConfig = {
    "apiKey":"AIzaSyB8mujwEnMA0oynk5liia3QXPMWGQyPRfs",
    "authDomain":"hwayangchurch-parking-app.firebaseapp.com",
    "projectId":"hwayangchurch-parking-app",
    "storageBucket":"hwayangchurch-parking-app.appspot.com",
    "messagingSenderId":"104913357347",
    "appId":"1:104913357347:web:e3054f97d1d63b97cf7f96"
};

const appId = "my-church-parking";

let app;
let db;
let auth;

try {
  if (Object.keys(firebaseConfig).length > 0 && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    setLogLevel('debug');
  } else {
    throw new Error("Firebase config is invalid or missing.");
  }
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
}

const PARKING_LOCATIONS = [
  "어린이회관 주차장1", "어린이회관 주차장2", "세종대 대양AI센터 주차장",
  "국민은행 주차장", "교회 뒷편 세종대 주차장", "광진광장 공영주차장"
];
const ALL_LOCATIONS_VALUE = "ALL_PARKING_LOCATIONS";

const POSITIONS = ["청년", "성도", "집사", "권사", "장로", "목사"];
const DEFAULT_HOURLY_RATE = 3000;
const BANK_NAMES_RAW = [
  "우리", "기업", "산업", "국민", "농협", "하나", "신한",
  "한국씨티", "토스뱅크", "케이뱅크", "카카오뱅크", "수협", "외환", "SC제일"
];
const BANK_NAMES_WITH_OTHER = [...BANK_NAMES_RAW.sort((a, b) => a.localeCompare(b, 'ko-KR')), "기타"];

const formInputOneUI = "block w-full px-5 py-3.5 text-base text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white hover:border-slate-300";

function App() {
  const [currentPage, setCurrentPage] = useState('entry');
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [lastEnteredParkingDate, setLastEnteredParkingDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastEnteredParkingLocation, setLastEnteredParkingLocation] = useState(PARKING_LOCATIONS[0]);

  useEffect(() => {
    if (!auth) {
      setAuthError("Firebase Auth 서비스 초기화 실패");
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthReady(true);
        setAuthError(null);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Firebase 로그인 오류:", error);
          setAuthError(`로그인 실패: ${error.message}`);
          setUserId(null);
          setIsAuthReady(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (!auth || !db) {
      return (
          <div className="p-6 text-red-700 bg-red-100 rounded-xl shadow-lg max-w-lg mx-auto mt-12 text-center">
              <strong>Firebase 초기화 실패</strong>
              <p className="mt-2 text-sm">Firebase 설정에 문제가 있어 앱을 시작할 수 없습니다. 관리자에게 문의하세요.</p>
          </div>
      );
  }

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100">
        <div className="p-10 bg-white rounded-2xl shadow-2xl text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-500 mx-auto mb-8" />
          <p className="text-2xl font-semibold text-slate-700">인증 정보를 확인 중입니다...</p>
          {authError && <p className="text-base text-red-600 mt-4">{authError}</p>}
        </div>
      </div>
    );
  }
  if (authError && !userId) {
    return <div className="p-6 text-red-700 bg-red-100 rounded-xl shadow-lg max-w-lg mx-auto mt-12 text-center"><strong>인증 오류</strong><p className="mt-2 text-sm">{authError}</p></div>;
  }
   if (dbError) {
    return <div className="p-6 text-red-700 bg-red-100 rounded-xl shadow-lg max-w-lg mx-auto mt-12 text-center"><strong>데이터베이스 오류</strong><p className="mt-2 text-sm">{dbError}</p></div>;
  }


  const navigationButtons = (
    <nav className="flex space-x-3">
      <button
        onClick={() => setCurrentPage('entry')}
        className={`flex items-center justify-center px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-1
                    ${currentPage === 'entry' ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-blue-400' : 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400'}`}
      >
        <FileText className="w-5 h-5 mr-2.5" />입력
      </button>
      <button
        onClick={() => setCurrentPage('query')}
        className={`flex items-center justify-center px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-1
                    ${currentPage === 'query' ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-blue-400' : 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400'}`}
      >
        <Search className="w-5 h-5 mr-2.5" />조회
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center text-3xl font-bold text-slate-800 mb-4 sm:mb-0">
            <Building className="w-9 h-9 mr-3.5 text-blue-600" />교회 주차 정산
          </div>
          {navigationButtons}
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow w-full">
        {currentPage === 'entry' &&
            <EntryForm
                db={db}
                userId={userId}
                isAuthReady={isAuthReady}
                setDbError={setDbError}
                lastEnteredParkingDateFromApp={lastEnteredParkingDate}
                setLastEnteredParkingDateInApp={setLastEnteredParkingDate}
                lastEnteredParkingLocationFromApp={lastEnteredParkingLocation}
                setLastEnteredParkingLocationInApp={setLastEnteredParkingLocation}
            />}
        {currentPage === 'query' && <QueryPage db={db} userId={userId} isAuthReady={isAuthReady} setDbError={setDbError} />}
      </main>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-center sm:justify-end border-t border-slate-200 bg-white shadow-top-lg">
        {navigationButtons}
      </div>
      <footer className="text-center py-6 text-sm text-slate-500 bg-slate-200">
        © {new Date().getFullYear()} 교회 주차 관리 시스템. App ID: <span className="font-mono text-slate-600">{appId}</span>
        {userId && <span className="block sm:inline sm:ml-3 mt-1.5 sm:mt-0">User ID: <span className="font-mono text-slate-600">{userId}</span></span>}
      </footer>
    </div>
  );
}

function EntryForm({
    db,
    userId,
    isAuthReady,
    setDbError,
    lastEnteredParkingDateFromApp,
    setLastEnteredParkingDateInApp,
    lastEnteredParkingLocationFromApp,
    setLastEnteredParkingLocationInApp
}) {
  const [parkingLocation, setParkingLocation] = useState(lastEnteredParkingLocationFromApp || PARKING_LOCATIONS[0]);
  const [parkingDate, setParkingDate] = useState(lastEnteredParkingDateFromApp || new Date().toISOString().split('T')[0]);
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
    if (isAuthReady && db && userId) {
      const fetchParkingRecords = async () => {
        try {
          const recordsRef = collection(db, `/artifacts/${appId}/public/data/parkingRecords`);
          const q = query(recordsRef);
          const querySnapshot = await getDocs(q);
          const records = [];
          querySnapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));

          const latestUserRecords = {};
          records.forEach(record => {
            if (!latestUserRecords[record.name] ||
                new Date(record.createdAt?.toDate() || record.parkingDate) > new Date(latestUserRecords[record.name].createdAt?.toDate() || latestUserRecords[record.name].parkingDate)) {
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
  }, [db, userId, isAuthReady, setDbError, appId]);


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
    const numericValue = rawValue.replace(/-/g, '');
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
    if (!isAuthReady || !userId || !db) {
      setMessage({ type: 'error', text: '데이터베이스 연결이 준비되지 않았습니다.' }); return;
    }
    setIsLoading(true); setMessage({ type: '', text: '' });
    const durationHours = getParkingDurationHours();
    if (durationHours <= 0) {
      setMessage({ type: 'error', text: '유효한 주차 시간을 입력해주세요.' }); setIsLoading(false); return;
    }
    const currentHourlyRate = parseFloat(hourlyRate) || DEFAULT_HOURLY_RATE;
    if (currentHourlyRate <= 0) {
      setMessage({ type: 'error', text: '유효한 시간당 주차 요금을 입력해주세요.' }); setIsLoading(false); return;
    }
    const finalBankName = selectedBank === '기타' ? customBankName.trim() : selectedBank;
    if (selectedBank === '기타' && !finalBankName) {
      setMessage({ type: 'error', text: '기타 은행명을 입력해주세요.' }); setIsLoading(false); return;
    }
    if (!accountNumber.trim()) {
      setMessage({ type: 'error', text: '계좌번호를 입력해주세요.' }); setIsLoading(false); return;
    }
    const accountInfoString = `${finalBankName}/${accountNumber.trim()}`;
    const newRecord = {
      appId, userId, parkingLocation, parkingDate, name: name.trim(), position, accountInfo: accountInfoString,
      parkingDurationHours: durationHours, isCustomDuration: parkingDurationOption === 'custom',
      customDurationDetail: parkingDurationOption === 'custom' ? customDuration : '',
      hourlyRate: currentHourlyRate, calculatedFee: durationHours * currentHourlyRate, createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, `/artifacts/${appId}/public/data/parkingRecords`), newRecord);
      setMessage({ type: 'success', text: '데이터가 성공적으로 저장되었습니다.' });

      setLastEnteredParkingDateInApp(parkingDate);
      setLastEnteredParkingLocationInApp(parkingLocation);

      setName('');
      setPosition(POSITIONS[0]);
      setSelectedBank(BANK_NAMES_WITH_OTHER[0]);
      setCustomBankName('');
      setAccountNumber('');
      setParkingDurationOption('4');
      setCustomDuration('');
      setHourlyRate(DEFAULT_HOURLY_RATE.toString());

      const updatedUserRecord = { ...newRecord, createdAt: new Date() };
      setAllUserRecords(prevRecords => {
          const latestUserRecords = {...prevRecords.reduce((acc, rec) => ({...acc, [rec.name]: rec}), {})};
          if (!latestUserRecords[updatedUserRecord.name] ||
              new Date(updatedUserRecord.createdAt) > new Date(latestUserRecords[updatedUserRecord.name].createdAt?.toDate() || latestUserRecords[updatedUserRecord.name].parkingDate)) {
            latestUserRecords[updatedUserRecord.name] = updatedUserRecord;
          }
          return Object.values(latestUserRecords);
      });

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
                <li key={index} onClick={() => handleNameSuggestionClick(suggestion)} className="px-6 py-3.5 hover:bg-slate-100 cursor-pointer text-base text-slate-700">
                  {suggestion}
                </li>
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
                <input
                    type="text"
                    id="accountNumber"
                    value={accountNumber}
                    onChange={handleAccountNumberChange}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="계좌번호를 입력하세요 (-는 자동으로 제거됩니다)"
                    className={formInputOneUI}
                    required
                />
                {showAccountInfoSuggestions && accountInfoSuggestions.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border-2 border-slate-200 rounded-xl mt-1.5 max-h-56 overflow-y-auto shadow-xl">
                    {accountInfoSuggestions.map((suggestion, index) => (
                    <li key={index} onClick={() => handleAccountInfoSuggestionClick(suggestion)} className="px-6 py-3.5 hover:bg-slate-100 cursor-pointer text-base text-slate-700">
                        {suggestion}
                    </li>
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
        <button type="submit" disabled={isLoading || !isAuthReady} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300 text-lg mt-12">
            {isLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Save className="w-6 h-6 mr-3" />}
            {isLoading ? '저장 중...' : '정보 저장하기'}
        </button>
      </form>
    </div>
  );
}

const FormItem = ({ icon: IconComponent, label, children }) => (
  <div>
    <label className="block text-lg font-semibold text-slate-700 mb-3 flex items-center">
      {IconComponent && <IconComponent className="w-7 h-7 text-slate-500 mr-3.5" /> }
      {label}
    </label>
    {children}
  </div>
);


function QueryPage({ db, userId, isAuthReady, setDbError }) {
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


  const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount) + '원';

  const getTopParkingLocationsHelper = (records, count = 1) => {
    if (!records || records.length === 0) return '데이터 없음';
    const locationCounts = records.reduce((acc, record) => {
      acc[record.parkingLocation] = (acc[record.parkingLocation] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([location, num]) => `${location} (${num}건)`)
      .join(', ');
  };

  const getTopParkersByFee = (totals, count = 3) => {
    return Object.values(totals)
      .sort((a, b) => b.totalFee - a.totalFee)
      .slice(0, count)
      .map(item => `${item.name} (${formatCurrency(item.totalFee)})`)
      .join(', ');
  };

  const handleAiAnalysis = async () => {
    if (results.length === 0) {
      setAiError("분석할 데이터가 없습니다. 먼저 데이터를 검색해주세요.");
      setShowAiSummaryModal(true);
      return;
    }
    setIsAiLoading(true);
    setAiSummary('');
    setAiError('');
    setShowAiSummaryModal(true);

    const topParkers = getTopParkersByFee(nameAccountTotals);

    let prompt = `
      다음은 교회 주차 정산 데이터입니다. 이 데이터를 바탕으로 사용자 친화적인 한국어 요약을 작성해주세요.

      검색 조건:
      - 이름: ${searchName.trim() || '전체'}
      - 기간: ${searchStartDate || '전체 시작일'} ~ ${searchEndDate || '전체 종료일'}
      - 주차 장소: ${searchParkingLocation === ALL_LOCATIONS_VALUE ? '전체' : searchParkingLocation}

      분석 결과:
      - 총 주차 기록 건수: ${results.length}건
      - 총 정산된 주차 비용: ${formatCurrency(totalFee)}
      - 이 기간 가장 많이 이용된 주차 장소: ${periodTopLocation || '데이터 부족'}
    `;

    if (searchName.trim() && individualTopLocation) {
      prompt += `\n      - ${searchName.trim()}님이 가장 많이 이용한 주차 장소: ${individualTopLocation}`;
    }

    prompt += `

      주요 정산 내역 요약 (이름 | 계좌 정보 | 해당 기간 총 주차비, 상위 5건):
      ${Object.values(nameAccountTotals).slice(0, 5).map(item => `- ${item.name} | ${item.accountInfo} | ${formatCurrency(item.totalFee)}`).join('\n')}
      ${Object.values(nameAccountTotals).length > 5 ? '(... 외 다수)' : ''}

      가장 많이 주차 비용을 정산한 성도 (상위 3명, 총액 기준): ${topParkers || '데이터 부족'}

      요약에는 다음 사항을 포함해주세요:
      1. 전체적인 주차 현황 (검색된 기간, 조건, 총 건수, 총액)을 간략히 언급해주세요.
      2. 이 기간 동안 가장 많이 이용된 주차 장소에 대해 설명해주세요.
      3. 만약 특정 이름으로 검색했다면, 해당 성도가 가장 많이 이용한 주차 장소에 대해서도 언급해주세요.
      4. 주요 정산 대상자 및 금액, 그리고 가장 많은 비용을 정산한 성도들에 대해 설명해주세요.
      5. 데이터에서 발견할 수 있는 기타 주목할 만한 사항이나 패턴이 있다면 자유롭게 언급해주세요.

      결과는 명확하고 간결하게, 이해하기 쉬운 문장으로 작성해주세요. 보고서 형식보다는 설명 형식으로 부탁드립니다.
    `;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API 오류 응답:", errorData);
        throw new Error(`AI 분석 서비스 호출 실패: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setAiSummary(text);
      } else {
        console.error("Gemini API 예상치 못한 응답 구조:", result);
        throw new Error("AI 분석 결과를 가져오지 못했습니다. 응답 형식이 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("AI 분석 오류:", error);
      setAiError(`AI 분석 중 오류 발생: ${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      setAiError('클립보드 복사에 실패했습니다.');
    }
    document.body.removeChild(textArea);
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
      setMessage("다운로드할 데이터가 없습니다.");
      return;
    }
    const headers = ["날짜", "이름", "직분", "주차장소", "주차시간(시간)", "시간당요금(원)", "계산된요금(원)", "계좌정보"];
    let csvContent = "\uFEFF" + headers.join(",") + "\r\n";
    results.forEach(record => {
      const row = [
        record.parkingDate, record.name, record.position, record.parkingLocation,
        record.parkingDurationHours + (record.isCustomDuration ? ` (${record.customDurationDetail})` : ''),
        record.hourlyRate, record.calculatedFee, record.accountInfo
      ].map(escapeCsvCell).join(",");
      csvContent += row + "\r\n";
    });
    csvContent += "\r\n";
    csvContent += `총 주차비용 합계:,${escapeCsvCell(formatCurrency(totalFee))}\r\n\r\n`;
    if (Object.keys(nameAccountTotals).length > 0) {
      csvContent += "이름,계좌정보,해당 기간 주차비 합계\r\n";
      Object.values(nameAccountTotals)
        .sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name, 'ko-KR');
          if (nameCompare !== 0) return nameCompare;
          return a.accountInfo.localeCompare(b.accountInfo);
        })
        .forEach(data => {
          const row = [data.name, data.accountInfo, data.totalFee].map(escapeCsvCell).join(",");
          csvContent += row + "\r\n";
        });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `주차정산내역_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSearch = async (keepCurrentResults = false) => {
    if (!isAuthReady || !userId || !db) {
      setMessage('데이터베이스 연결이 준비되지 않았습니다.'); return;
    }
    setIsLoading(true);
    if (!keepCurrentResults) {
        setResults([]);
        setTotalFee(0);
        setNameAccountTotals({});
        setPeriodTopLocation('');
        setIndividualTopLocation('');
    }
    setMessage(''); setDeleteMessage({ type: '', text: '' });

    try {
      const parkingRecordsRef = collection(db, `/artifacts/${appId}/public/data/parkingRecords`);
      let q = query(parkingRecordsRef);

      if (searchStartDate) {
        q = query(q, where("parkingDate", ">=", searchStartDate));
      }
      if (searchEndDate) {
        q = query(q, where("parkingDate", "<=", searchEndDate));
      }
      if (searchParkingLocation && searchParkingLocation !== ALL_LOCATIONS_VALUE) {
        q = query(q, where("parkingLocation", "==", searchParkingLocation));
      }
      if (searchName.trim()) {
        q = query(q, where("name", "==", searchName.trim()));
      }

      const querySnapshot = await getDocs(q);
      let fetchedRecords = [];
      querySnapshot.forEach((doc) => fetchedRecords.push({ id: doc.id, ...doc.data() }));

      const sortedDetailedResults = [...fetchedRecords].sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, 'ko-KR');
        if (nameCompare !== 0) return nameCompare;
        return new Date(b.parkingDate) - new Date(a.parkingDate);
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

      setPeriodTopLocation(getTopParkingLocationsHelper(fetchedRecords, 1));
      if (searchName.trim()) {
        const userSpecificRecords = fetchedRecords.filter(r => r.name === searchName.trim());
        setIndividualTopLocation(getTopParkingLocationsHelper(userSpecificRecords, 1));
      } else {
        setIndividualTopLocation('');
      }


      if (fetchedRecords.length === 0 && !keepCurrentResults) setMessage('검색 결과가 없습니다.');
    } catch (error) {
      console.error("데이터 조회 오류: ", error);
      setMessage(`조회 오류: ${error.message}`);
      setDbError(`조회 오류: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttempt = (recordId) => {
    setItemToDelete(recordId); setShowDeleteModal(true); setDeleteMessage({ type: '', text: '' });
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !db) {
      setDeleteMessage({ type: 'error', text: '삭제 항목 지정 오류 또는 DB 연결 오류입니다.' });
      return;
    }
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, `/artifacts/${appId}/public/data/parkingRecords`, itemToDelete));
      setDeleteMessage({ type: 'success', text: '항목이 성공적으로 삭제되었습니다.'});

      const updatedResults = results.filter(r => r.id !== itemToDelete);
      setResults(updatedResults);

      let currentTotalFee = 0;
      const updatedNameAccountTotals = updatedResults.reduce((acc, record) => {
        const key = `${record.name} | ${record.accountInfo}`;
        if (!acc[key]) {
          acc[key] = { name: record.name, accountInfo: record.accountInfo, totalFee: 0 };
        }
        acc[key].totalFee += (record.calculatedFee || 0);
        currentTotalFee += (record.calculatedFee || 0);
        return acc;
      }, {});
      setTotalFee(currentTotalFee);
      setNameAccountTotals(updatedNameAccountTotals);

      setPeriodTopLocation(getTopParkingLocationsHelper(updatedResults, 1));
      if (searchName.trim()) {
        const userSpecificRecords = updatedResults.filter(r => r.name === searchName.trim());
        setIndividualTopLocation(getTopParkingLocationsHelper(userSpecificRecords, 1));
      } else {
        setIndividualTopLocation('');
      }

      setItemToDelete(null);
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
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-bold text-slate-800 mb-12 text-center">주차 정보 조회</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-12 items-end">
          <div>
            <label htmlFor="searchName" className="block text-lg font-semibold text-slate-700 mb-2.5">이름 검색</label>
            <input type="text" id="searchName" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="이름 입력" className={formInputOneUI}/>
          </div>
          <div>
            <label htmlFor="searchParkingLocation" className="block text-lg font-semibold text-slate-700 mb-2.5">주차 장소 선택</label>
            <select id="searchParkingLocation" value={searchParkingLocation} onChange={(e) => setSearchParkingLocation(e.target.value)} className={formInputOneUI}>
              <option value={ALL_LOCATIONS_VALUE}>전체 주차 장소</option>
              {PARKING_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="searchStartDate" className="block text-lg font-semibold text-slate-700 mb-2.5">시작 날짜</label>
            <input type="date" id="searchStartDate" value={searchStartDate} onChange={(e) => setSearchStartDate(e.target.value)} className={formInputOneUI}/>
          </div>
          <div>
            <label htmlFor="searchEndDate" className="block text-lg font-semibold text-slate-700 mb-2.5">종료 날짜</label>
            <input type="date" id="searchEndDate" value={searchEndDate} onChange={(e) => setSearchEndDate(e.target.value)} className={formInputOneUI}/>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          <button onClick={() => handleSearch(false)} disabled={isLoading || !isAuthReady} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300 text-lg">
              {isLoading && !showDeleteModal && !isAiLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Search className="w-6 h-6 mr-3" />}
              {isLoading && !showDeleteModal && !isAiLoading ? '검색 중...' : '검색하기'}
          </button>
          <button onClick={downloadExcel} disabled={results.length === 0 || isLoading || isAiLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-green-300 text-lg">
              <Download className="w-6 h-6 mr-3" />
              엑셀로 다운로드
          </button>
        </div>
        <div className="mt-5">
            <button
                onClick={handleAiAnalysis}
                disabled={results.length === 0 || isLoading || isAiLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-150 ease-in-out flex items-center justify-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-purple-300 text-lg"
            >
                {isAiLoading ? <Loader2 className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" /> : <Sparkles className="w-6 h-6 mr-3" />}
                {isAiLoading ? 'AI 분석 중...' : '✨ AI 주차 데이터 분석'}
            </button>
        </div>

        {message && <p className="text-center text-slate-600 mt-10 text-base">{message}</p>}
        {deleteMessage.text && !showDeleteModal && <div className={`p-4 rounded-xl mt-10 text-sm ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>{deleteMessage.text}</div>}
      </div>

      {results.length > 0 && (
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl mb-10">
            <h2 className="text-2xl font-semibold text-slate-800 mb-5">선택 기간 총 주차비용</h2>
            <p className="text-4xl font-bold text-blue-600">{formatCurrency(totalFee)}</p>
        </div>
      )}
      
      {Object.keys(nameAccountTotals).length > 0 && (
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl mb-10">
          <h2 className="text-2xl font-semibold text-slate-800 mb-8 flex items-center"><ListChecks size={30} className="mr-4 text-blue-600" />이름 및 계좌별 합계</h2>
          <ul className="space-y-5">
            {Object.values(nameAccountTotals)
              .sort((a, b) => {
                const nameCompare = a.name.localeCompare(b.name, 'ko-KR');
                if (nameCompare !== 0) return nameCompare;
                return a.accountInfo.localeCompare(b.accountInfo);
              })
              .map((data) => (
              <li key={`${data.name}-${data.accountInfo}`} className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-shadow duration-200 bg-slate-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="mb-2 sm:mb-0 flex-grow">
                        <p className="text-xl font-semibold text-slate-800">{data.name}</p>
                        <p className="text-sm text-slate-500 mt-1.5">{data.accountInfo}</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 sm:text-right whitespace-nowrap mt-2 sm:mt-0">{formatCurrency(data.totalFee)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <h2 className="text-2xl font-semibold text-slate-800 p-8 sm:p-10 pb-5">상세 주차 기록</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                <thead className="bg-slate-100 border-b-2 border-slate-200"><tr><Th>날짜</Th><Th>이름</Th><Th>직분</Th><Th>주차장소</Th><Th>주차시간</Th><Th>시간당요금</Th><Th>계산된요금</Th><Th>계좌정보</Th><Th className="text-right pr-8">작업</Th></tr></thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {results.map(record => (<tr key={record.id} className="hover:bg-slate-50/70 transition-colors duration-150"><Td>{record.parkingDate}</Td><Td>{record.name}</Td><Td>{record.position}</Td><Td>{record.parkingLocation}</Td><Td>{record.parkingDurationHours}시간 {record.isCustomDuration ? `(${record.customDurationDetail})` : ''}</Td><Td>{formatCurrency(record.hourlyRate)}</Td><Td className="font-semibold text-blue-600">{formatCurrency(record.calculatedFee)}</Td><Td>{record.accountInfo}</Td><Td className="text-right pr-6"><button onClick={() => handleDeleteAttempt(record.id)} className="text-red-600 hover:text-red-700 p-2.5 rounded-lg hover:bg-red-100 transition-colors" title="삭제"><Trash2 size={20} /></button></Td></tr>))}
                </tbody>
                </table>
            </div>
        </div>
      )}
      {results.length === 0 && !isLoading && !message && <div className="bg-white p-12 rounded-2xl shadow-xl text-center"><p className="text-slate-500 text-xl">조회할 조건을 입력하고 검색 버튼을 눌러주세요.</p></div>}
      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all duration-300 ease-out scale-100 opacity-100">
            <div className="flex items-start mb-7">
              <div className="p-3.5 bg-red-100 rounded-full mr-6 shrink-0">
                <AlertTriangle className="text-red-500 w-9 h-9" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-800">항목 삭제 확인</h3>
                <p className="text-slate-600 mt-2.5 text-base">정말로 이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            {deleteMessage.text && <div className={`p-4 rounded-xl mb-7 text-sm ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>{deleteMessage.text}</div>}
            <div className="flex justify-end space-x-4">
              <button onClick={() => { setShowDeleteModal(false); setItemToDelete(null); setDeleteMessage({ type: '', text: '' }); }} disabled={isLoading && itemToDelete !== null} className="px-7 py-3.5 text-base font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-slate-300">취소</button>
              <button onClick={confirmDelete} disabled={isLoading && itemToDelete !== null} className="px-7 py-3.5 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-red-300">{isLoading && itemToDelete !== null ? <Loader2 className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" /> : <Trash2 size={18} className="mr-2.5" />}{isLoading && itemToDelete !== null ? '삭제 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}

      {showAiSummaryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all duration-300 ease-out scale-100 opacity-100 flex flex-col" style={{maxHeight: '90vh'}}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-slate-800 flex items-center">
                <Sparkles className="w-7 h-7 mr-3 text-purple-600" />
                AI 주차 데이터 분석 결과
              </h3>
              <button onClick={() => setShowAiSummaryModal(false)} className="text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {isAiLoading && (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="animate-spin h-12 w-12 text-purple-600 mb-6" />
                <p className="text-slate-600 text-lg">AI가 데이터를 분석하고 있습니다. 잠시만 기다려주세요...</p>
              </div>
            )}

            {aiError && !isAiLoading && (
              <div className="p-5 bg-red-50 border border-red-300 rounded-xl text-red-700 mb-6">
                <p className="font-semibold">오류 발생</p>
                <p className="text-sm mt-1">{aiError}</p>
              </div>
            )}

            {!isAiLoading && aiSummary && (
              <div className="prose prose-sm sm:prose-base max-w-none overflow-y-auto flex-grow mb-6 pr-2 whitespace-pre-wrap" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                {aiSummary}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-200">
              {!isAiLoading && aiSummary && (
                 <button
                    onClick={() => copyToClipboard(aiSummary)}
                    className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-blue-300"
                  >
                    <Copy size={18} className="mr-2.5" />
                    {copied ? '복사 완료!' : '요약 복사하기'}
                  </button>
              )}
              <button
                onClick={() => setShowAiSummaryModal(false)}
                className="px-6 py-3 text-base font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-slate-300"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Th = ({ children, className = '' }) => <th scope="col" className={`px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider ${className}`}>{children}</th>;
const Td = ({ children, className = '' }) => <td className={`px-6 py-5 whitespace-nowrap text-base text-slate-700 ${className}`}>{children}</td>;

export default App;
