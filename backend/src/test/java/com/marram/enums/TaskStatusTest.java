package com.marram.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class TaskStatusTest {

    @Test
    void followsTheDocumentedWorkflow() {
        assertThat(TaskStatus.TODO.allowedNext(true)).containsExactly(TaskStatus.IN_PROGRESS);
        assertThat(TaskStatus.IN_PROGRESS.allowedNext(false)).containsExactlyInAnyOrder(TaskStatus.IN_REVIEW, TaskStatus.BLOCKED);
        assertThat(TaskStatus.BLOCKED.allowedNext(false)).containsExactly(TaskStatus.IN_PROGRESS);
        assertThat(TaskStatus.IN_REVIEW.allowedNext(false)).containsExactlyInAnyOrder(TaskStatus.IN_PROGRESS, TaskStatus.DONE);
    }

    @Test
    void cannotSkipStraightToDone() {
        assertThat(TaskStatus.TODO.canMoveTo(TaskStatus.DONE, true)).isFalse();
        assertThat(TaskStatus.IN_PROGRESS.canMoveTo(TaskStatus.DONE, true)).isFalse();
    }

    @Test
    void reopeningIsReservedForManagers() {
        assertThat(TaskStatus.DONE.canMoveTo(TaskStatus.IN_PROGRESS, true)).isTrue();
        assertThat(TaskStatus.DONE.canMoveTo(TaskStatus.IN_PROGRESS, false)).isFalse();
        assertThat(TaskStatus.DONE.allowedNext(false)).isEmpty();
    }

    @Test
    void everyStatusHasADefinedTransitionSet() {
        for (TaskStatus s : TaskStatus.values()) {
            Set<TaskStatus> next = s.allowedNext(true);
            assertThat(next).doesNotContain(s);
        }
    }
}
