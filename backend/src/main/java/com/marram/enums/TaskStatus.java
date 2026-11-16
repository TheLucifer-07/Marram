package com.marram.enums;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum TaskStatus {
    TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, DONE;

    private static final Map<TaskStatus, Set<TaskStatus>> TRANSITIONS = new EnumMap<>(TaskStatus.class);

    static {
        TRANSITIONS.put(TODO, EnumSet.of(IN_PROGRESS));
        TRANSITIONS.put(IN_PROGRESS, EnumSet.of(IN_REVIEW, BLOCKED));
        TRANSITIONS.put(BLOCKED, EnumSet.of(IN_PROGRESS));
        TRANSITIONS.put(IN_REVIEW, EnumSet.of(IN_PROGRESS, DONE));
        TRANSITIONS.put(DONE, EnumSet.of(IN_PROGRESS)); // reopening
    }

    /**
     * Statuses reachable from this one. Reopening a DONE task is an explicit privilege of OWNER and LEAD,
     * so a plain member never sees it as an option.
     */
    public Set<TaskStatus> allowedNext(boolean canReopen) {
        EnumSet<TaskStatus> next = EnumSet.copyOf(TRANSITIONS.get(this));
        if (this == DONE && !canReopen) {
            next.clear();
        }
        return next;
    }

    public boolean canMoveTo(TaskStatus target, boolean canReopen) {
        return allowedNext(canReopen).contains(target);
    }
}
