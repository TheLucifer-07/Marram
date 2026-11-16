package com.marram.service;

import com.marram.exception.BadRequestException;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Builds a safe Pageable: size is capped at 100 and sort fields must come from an allowlist. */
public final class Pages {
    public static final int MAX_SIZE = 100;

    private Pages() {}

    public static Pageable of(int page, int size, String sort, Map<String, String> allowed, Sort fallback) {
        int p = Math.max(page, 0);
        int s = Math.min(Math.max(size, 1), MAX_SIZE);
        Sort order = fallback;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String property = allowed.get(parts[0].trim());
            if (property == null) {
                throw new BadRequestException("Cannot sort by '" + parts[0].trim() + "'. Allowed: " + String.join(", ", allowed.keySet()));
            }
            boolean desc = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim());
            Sort.Order o = desc ? Sort.Order.desc(property) : Sort.Order.asc(property);
            if (property.equals("dueDate")) o = o.nullsLast();
            order = Sort.by(o, Sort.Order.desc("id"));
        }
        return PageRequest.of(p, s, order);
    }

    public static String like(String q) {
        return "%" + q.trim().toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
