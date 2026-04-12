"use client";

/**
 * ThinkBridge authentication context provider.
 * JWT stored in localStorage. Provides login/register/guest/logout + auto-redirect.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@/types";
import { STORAGE_KEY_TOKEN, STORAGE_KEY_USER } from "@/lib/constants";
import * as api from "@/lib/api";


// --- Constants ---

/** Pages accessible without authentication */
const PUBLIC_PATHS = ["/", "/login", "/register"];

/** Redirect target for unauthenticated users */
const LOGIN_PATH = "/login";

/**
 * 역할별 홈 경로 상수 — landing/navbar 등 외부에서도 재사용 가능하도록 export.
 * 기존 내부 상수(STUDENT_HOME_PATH 등)는 호환성 유지를 위해 동일 값으로 별도 선언 유지.
 */
export const HOME_PATH_STUDENT = "/student/chat";
export const HOME_PATH_INSTRUCTOR = "/instructor/dashboard";
export const HOME_PATH_ADMIN = "/admin/dashboard";

/** Redirect target after successful login (student default) */
const STUDENT_HOME_PATH = HOME_PATH_STUDENT;

/** Redirect target for instructor after login */
const INSTRUCTOR_HOME_PATH = HOME_PATH_INSTRUCTOR;

/** Redirect target for admin after login */
const ADMIN_HOME_PATH = HOME_PATH_ADMIN;


// --- Auth Context Type ---

interface AuthContextType
{
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string, role?: string) => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);


// --- Helper Functions ---

/**
 * Determines the appropriate home page based on user role.
 * Exported so landing page / Navbar can route authenticated users consistently.
 */
export function getHomePathForRole(role: string): string
{
    if (role === "instructor")
    {
        return INSTRUCTOR_HOME_PATH;
    }
    if (role === "admin")
    {
        return ADMIN_HOME_PATH;
    }
    return STUDENT_HOME_PATH;
}

/**
 * Safely reads a value from localStorage (handles SSR and parse errors).
 */
function readFromStorage<T>(key: string): T | null
{
    if (typeof window === "undefined")
    {
        return null;
    }

    try
    {
        const tRaw = localStorage.getItem(key);
        if (tRaw === null)
        {
            return null;
        }
        return JSON.parse(tRaw) as T;
    }
    catch
    {
        return null;
    }
}

/**
 * Saves auth credentials to localStorage.
 */
function saveToStorage(token: string, user: User): void
{
    localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(token));
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

/**
 * Clears auth credentials from localStorage.
 */
function clearStorage(): void
{
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
}


// --- Auth Provider Component ---

interface AuthProviderProps
{
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps)
{
    const [mUser, setUser] = useState<User | null>(null);
    const [mToken, setToken] = useState<string | null>(null);
    const [mIsLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const pathname = usePathname();

    // 초기 로드 시 localStorage에서 인증 정보 복원
    useEffect(() =>
    {
        const tStoredToken = readFromStorage<string>(STORAGE_KEY_TOKEN);
        const tStoredUser = readFromStorage<User>(STORAGE_KEY_USER);

        if (tStoredToken && tStoredUser)
        {
            setToken(tStoredToken);
            setUser(tStoredUser);
        }

        setIsLoading(false);
    }, []);

    // 인증 상태 변경 시 자동 리다이렉트
    useEffect(() =>
    {
        if (mIsLoading)
        {
            return;
        }

        const tIsPublicPath = PUBLIC_PATHS.includes(pathname);

        // 비인증 사용자가 보호된 페이지에 접근하면 로그인으로 리다이렉트
        if (!mUser && !tIsPublicPath)
        {
            router.push(LOGIN_PATH);
        }
    }, [mUser, mIsLoading, pathname, router]);

    /**
     * 이메일/비밀번호 로그인
     */
    const handleLogin = useCallback(async (email: string, password: string) =>
    {
        const tResponse = await api.login(email, password);
        setToken(tResponse.accessToken);
        setUser(tResponse.user);
        saveToStorage(tResponse.accessToken, tResponse.user);
        router.push(getHomePathForRole(tResponse.user.role));
    }, [router]);

    /**
     * 회원가입
     */
    const handleRegister = useCallback(async (
        email: string,
        name: string,
        password: string,
        role: string = "student",
    ) =>
    {
        const tResponse = await api.register(email, name, password, role);
        setToken(tResponse.accessToken);
        setUser(tResponse.user);
        saveToStorage(tResponse.accessToken, tResponse.user);
        router.push(getHomePathForRole(tResponse.user.role));
    }, [router]);

    /**
     * 게스트 체험 모드 로그인
     */
    const handleLoginAsGuest = useCallback(async () =>
    {
        const tResponse = await api.loginAsGuest();
        setToken(tResponse.accessToken);
        setUser(tResponse.user);
        saveToStorage(tResponse.accessToken, tResponse.user);
        router.push(STUDENT_HOME_PATH);
    }, [router]);

    /**
     * 로그아웃 - 인증 정보 삭제 후 랜딩 페이지로 이동
     */
    const handleLogout = useCallback(() =>
    {
        setToken(null);
        setUser(null);
        clearStorage();
        router.push("/");
    }, [router]);

    // createElement 대신 JSX 사용을 위한 값 구성
    const tContextValue: AuthContextType = {
        user: mUser,
        token: mToken,
        isLoading: mIsLoading,
        login: handleLogin,
        register: handleRegister,
        loginAsGuest: handleLoginAsGuest,
        logout: handleLogout,
    };

    return (
        <AuthContext.Provider value={tContextValue}>
            {children}
        </AuthContext.Provider>
    );
}


// --- Auth Hook ---

/**
 * Custom hook for accessing auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType
{
    const tContext = useContext(AuthContext);

    if (tContext === null)
    {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return tContext;
}
