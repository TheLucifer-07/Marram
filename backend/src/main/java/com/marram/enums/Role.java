package com.marram.enums;

public enum Role {
    OWNER, LEAD, MEMBER;

    /** OWNER and LEAD manage projects and tasks across the workspace. */
    public boolean managesWork() {
        return this == OWNER || this == LEAD;
    }
}
