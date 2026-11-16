package com.marram.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DashboardServiceTest {
    @Test
    void percentageIsZeroWhenThereAreNoTasks() {
        assertThat(DashboardService.completionPercentage(0, 0)).isEqualTo(0.0);
    }

    @Test
    void percentageIsRoundedToTwoPlaces() {
        assertThat(DashboardService.completionPercentage(18, 42)).isEqualTo(42.86);
        assertThat(DashboardService.completionPercentage(1, 3)).isEqualTo(33.33);
        assertThat(DashboardService.completionPercentage(5, 5)).isEqualTo(100.0);
    }
}
