import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Building } from 'lucide-react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 로그인 버튼을 눌렀을 때 실행되는 함수
  const handleLogin = async (e) => {
    e.preventDefault(); // form 태그의 기본 동작(페이지 새로고침)을 막습니다.
    setError(''); // 이전 에러 메시지를 초기화합니다.
    setLoading(true); // 로딩 상태 시작

    // 이메일, 비밀번호가 비어있는지 확인
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      setLoading(false);
      return;
    }

    const auth = getAuth();
    try {
      // Firebase에게 이메일과 비밀번호로 로그인을 요청합니다.
      await signInWithEmailAndPassword(auth, email, password);
      // 로그인이 성공하면, App.js의 onAuthStateChanged가 이를 감지하고
      // 자동으로 메인 페이지로 넘겨주므로 여기서 별도 작업은 필요 없습니다.
    } catch (err) {
      console.error("Firebase 로그인 오류:", err.code);
      // 사용자에게 친절한 에러 메시지를 보여줍니다.
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
        setLoading(false); // 로딩 상태 종료
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
            <label htmlFor="email" className="sr-only">
              이메일 주소
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-5 py-3.5 text-base text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="이메일 주소"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-5 py-3.5 text-base text-slate-800 bg-slate-100 border-2 border-slate-200 rounded-xl transition duration-150 ease-in-out placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="비밀번호"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-offset-1 focus:ring-blue-500 transition-all duration-200 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;