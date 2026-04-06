"use client";

/**
 * Class selector dropdown for instructor dashboard.
 * Allows instructors to switch between their assigned classes.
 */

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { ClassSummary } from "@/types";


// --- Constants ---

const PLACEHOLDER_TEXT = "반을 선택하세요";


// --- Props ---

interface ClassSelectorProps
{
    classes: ClassSummary[];
    selectedClassId: number | null;
    onSelect: (classId: number) => void;
}


// --- Component ---

export function ClassSelector({ classes, selectedClassId, onSelect }: ClassSelectorProps)
{
    return (
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
                반 선택
            </label>
            <Select
                value={selectedClassId !== null ? selectedClassId.toString() : undefined}
                onValueChange={(value) => onSelect(Number(value))}
            >
                <SelectTrigger className="w-64 bg-white">
                    <SelectValue placeholder={PLACEHOLDER_TEXT} />
                </SelectTrigger>
                <SelectContent>
                    {classes.map((classItem) =>
                    {
                        const tSubjectLabel = SUBJECT_LABELS[classItem.subject] || classItem.subject;

                        return (
                            <SelectItem
                                key={classItem.id}
                                value={classItem.id.toString()}
                            >
                                {classItem.name} ({tSubjectLabel} / {classItem.studentCount}명)
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
}
