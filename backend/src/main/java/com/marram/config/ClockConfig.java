package com.marram.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {
    /** "Today" for overdue and upcoming calculations. Configurable so a team's day boundary matches theirs. */
    @Bean
    Clock clock(AppProperties props) {
        return Clock.system(ZoneId.of(props.timeZone() == null || props.timeZone().isBlank() ? "UTC" : props.timeZone()));
    }
}
