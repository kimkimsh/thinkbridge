"use client";

/**
 * Instructor dashboard page.
 * Displays class-level summary metrics, a thinking dimension heatmap,
 * and a student list. Loads classes on mount and auto-selects the first class.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getClasses, getClassStudents, getClassHeatmap } from "@/lib/api";
import { ClassSelector } from "@/components/dashboard/ClassSelector";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { HeatmapChart } from "@/components/dashboard/HeatmapChart";
import { StudentList } from "@/components/dashboard/StudentList";
import type { ClassSummary, StudentSummary, HeatmapResponse } from "@/types";


// --- Constants ---

const PAGE_TITLE = "교강사 대시보드";
const ERROR_LOAD_CLASSES = "반 목록을 불러오는 중 오류가 발생했습니다.";
const ERROR_LOAD_DATA = "데이터를 불러오는 중 오류가 발생했습니다.";


// --- Component ---

export default function InstructorDashboardPage()
{
    const { token } = useAuth();

    const [mClasses, setClasses] = useState<ClassSummary[]>([]);
    const [mSelectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [mStudents, setStudents] = useState<StudentSummary[]>([]);
    const [mHeatmap, setHeatmap] = useState<HeatmapResponse | null>(null);

    const [mIsLoadingClasses, setIsLoadingClasses] = useState(true);
    const [mIsLoadingData, setIsLoadingData] = useState(false);
    const [mError, setError] = useState<string | null>(null);

    /**
     * 반 목록 로드 - 마운트 시 1회 실행, 첫 번째 반 자동 선택
     */
    useEffect(() =>
    {
        if (!token)
        {
            return;
        }

        let tIsCancelled = false;

        async function loadClasses()
        {
            try
            {
                const tClasses = await getClasses(token!);

                if (tIsCancelled)
                {
                    return;
                }

                setClasses(tClasses);

                // 첫 번째 반 자동 선택
                if (tClasses.length > 0)
                {
                    setSelectedClassId(tClasses[0].id);
                }
            }
            catch
            {
                if (!tIsCancelled)
                {
                    setError(ERROR_LOAD_CLASSES);
                }
            }
            finally
            {
                if (!tIsCancelled)
                {
                    setIsLoadingClasses(false);
                }
            }
        }

        loadClasses();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [token]);

    /**
     * 선택된 반의 학생 목록 + 히트맵 로드
     */
    const loadClassData = useCallback(async (classId: number) =>
    {
        if (!token)
        {
            return;
        }

        setIsLoadingData(true);
        setError(null);

        try
        {
            const [tStudents, tHeatmap] = await Promise.all([
                getClassStudents(classId, token),
                getClassHeatmap(classId, token),
            ]);

            setStudents(tStudents);
            setHeatmap(tHeatmap);
        }
        catch
        {
            setError(ERROR_LOAD_DATA);
        }
        finally
        {
            setIsLoadingData(false);
        }
    }, [token]);

    /**
     * 반 선택 변경 시 데이터 로드
     */
    useEffect(() =>
    {
        if (mSelectedClassId !== null)
        {
            loadClassData(mSelectedClassId);
        }
    }, [mSelectedClassId, loadClassData]);

    /**
     * 반 선택 핸들러
     */
    function handleClassSelect(classId: number)
    {
        setSelectedClassId(classId);
    }

    // 로딩 스켈레톤: 반 목록 로딩 중
    if (mIsLoadingClasses)
    {
        return (
            <div className="space-y-6 p-4 sm:p-6">
                <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-200" />
                    ))}
                </div>
                <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* 페이지 제목 */}
            <h1 className="text-xl font-bold text-gray-900">
                {PAGE_TITLE}
            </h1>

            {/* 반 선택 드롭다운 */}
            <ClassSelector
                classes={mClasses}
                selectedClassId={mSelectedClassId}
                onSelect={handleClassSelect}
            />

            {/* 에러 메시지 */}
            {mError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {mError}
                </div>
            )}

            {/* 데이터 로딩 스켈레톤 */}
            {mIsLoadingData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-200" />
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
                    <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
                </div>
            )}

            {/* 반이 선택되었고 로딩 완료 시 데이터 표시 */}
            {!mIsLoadingData && mSelectedClassId !== null && (
                <>
                    {/* 요약 카드 */}
                    <SummaryCards students={mStudents} />

                    {/* 사고력 히트맵 */}
                    {mHeatmap && (
                        <HeatmapChart data={mHeatmap} />
                    )}

                    {/* 학생 목록 */}
                    <StudentList students={mStudents} />
                </>
            )}

            {/* 반이 없는 경우 */}
            {!mIsLoadingClasses && mClasses.length === 0 && (
                <div className="rounded-lg border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">
                        담당 반이 없습니다.
                    </p>
                </div>
            )}
        </div>
    );
}
