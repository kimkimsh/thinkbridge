"use client";

/**
 * Student card grid for instructor dashboard.
 * Displays student name, session count, and color-coded average score.
 * Clicking a student card navigates to their session list for replay.
 */

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, ChevronRight } from "lucide-react";
import type { StudentSummary } from "@/types";


// --- Constants ---

const SCORE_THRESHOLD_HIGH = 7;
const SCORE_THRESHOLD_MID = 4;


// --- Props ---

interface StudentListProps
{
    students: StudentSummary[];
}


// --- Helper Functions ---

/**
 * Returns badge styling based on score thresholds.
 * Green for high scores, yellow for mid-range, red for low scores.
 */
function getScoreBadgeClassName(score: number): string
{
    if (score >= SCORE_THRESHOLD_HIGH)
    {
        return "bg-green-100 text-green-700 border-green-300";
    }
    if (score >= SCORE_THRESHOLD_MID)
    {
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }
    return "bg-red-100 text-red-700 border-red-300";
}


// --- Component ---

export function StudentList({ students }: StudentListProps)
{
    const router = useRouter();

    if (students.length === 0)
    {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <User className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    이 반에 등록된 학생이 없습니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
                학생 목록 ({students.length}명)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                    <Card
                        key={student.id}
                        className="cursor-pointer transition-shadow hover:shadow-md"
                        onClick={() => router.push(`/instructor/replay/${student.id}`)}
                    >
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                                    <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {student.name}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <BookOpen className="h-3 w-3" />
                                        <span>{student.sessionCount}회 세션</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={getScoreBadgeClassName(student.avgScore)}
                                >
                                    {student.avgScore.toFixed(1)}점
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
