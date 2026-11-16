package com.marram.security;

import java.lang.annotation.*;

/** Injects the application user resolved from the verified Supabase token. */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@io.swagger.v3.oas.annotations.Hidden
public @interface CurrentUser {}
