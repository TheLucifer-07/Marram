package com.marram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.marram.exception.BadRequestException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class PagesTest {
    static final Map<String, String> ALLOWED = Map.of("priority", "priorityRank", "title", "title");

    @Test
    void capsPageSizeAtOneHundredAndFloorsAtOne() {
        assertThat(Pages.of(0, 5000, null, ALLOWED, Sort.unsorted()).getPageSize()).isEqualTo(100);
        assertThat(Pages.of(-3, 0, null, ALLOWED, Sort.unsorted()).getPageNumber()).isZero();
        assertThat(Pages.of(0, 0, null, ALLOWED, Sort.unsorted()).getPageSize()).isEqualTo(1);
    }

    @Test
    void mapsAllowedSortFieldsToEntityProperties() {
        var p = Pages.of(0, 10, "priority,desc", ALLOWED, Sort.unsorted());
        assertThat(p.getSort().getOrderFor("priorityRank")).isNotNull();
        assertThat(p.getSort().getOrderFor("priorityRank").isDescending()).isTrue();
    }

    @Test
    void rejectsSortFieldsOutsideTheAllowlist() {
        assertThatThrownBy(() -> Pages.of(0, 10, "password_hash,asc", ALLOWED, Sort.unsorted())).isInstanceOf(BadRequestException.class);
    }

    @Test
    void escapesLikeWildcardsInSearchText() {
        assertThat(Pages.like("100%_done")).isEqualTo("%100\\%\\_done%");
    }
}
