package com.marram.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.marram.entity.Task;
import com.marram.service.TaskHistoryService;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Runs against a real MySQL 8 container with the Flyway migrations applied. Needs Docker: run with `mvn verify`. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class ApiFlowIT {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4");

    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", MYSQL::getJdbcUrl);
        r.add("spring.datasource.username", MYSQL::getUsername);
        r.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired MockMvc mvc;
    @MockitoSpyBean TaskHistoryService historySpy;

    /** A person as Supabase would present them: a verified token for a distinct subject and email. */
    record Person(String sub, String email, String name) {
        static Person fresh(String name) {
            String id = UUID.randomUUID().toString();
            return new Person(id, name.toLowerCase() + "-" + id.substring(0, 8) + "@example.com", name);
        }
        RequestPostProcessor token() {
            return jwt().jwt(j -> j.subject(sub).claim("email", email).claim("role", "authenticated").claim("user_metadata", Map.of("full_name", name, "email_verified", true)));
        }
    }

    long id(String json) { return ((Number) JsonPath.read(json, "$.id")).longValue(); }

    String send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b, Person p, String body, int expected) throws Exception {
        if (body != null) b.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(b.with(p.token())).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
    }

    long workspace(Person owner) throws Exception {
        send(get("/api/v1/auth/me"), owner, null, 200); // first sign-in provisions the profile
        return id(send(post("/api/v1/workspaces"), owner, "{\"name\":\"Team\"}", 201));
    }

    long project(Person p, long ws, String name) throws Exception {
        return id(send(post("/api/v1/workspaces/" + ws + "/projects"), p, "{\"name\":\"" + name + "\",\"startDate\":\"2026-11-01\"}", 201));
    }

    long task(Person p, long project, String title, String priority, Long assignee) throws Exception {
        String a = assignee == null ? "null" : assignee.toString();
        return id(send(post("/api/v1/projects/" + project + "/tasks"), p,
                "{\"title\":\"" + title + "\",\"priority\":\"" + priority + "\",\"assigneeId\":" + a + "}", 201));
    }

    long userId(Person p) throws Exception {
        return id(send(get("/api/v1/auth/me"), p, null, 200));
    }

    void addMember(Person owner, long ws, Person who, String role) throws Exception {
        userId(who); // they must have signed in once
        send(post("/api/v1/workspaces/" + ws + "/members"), owner, "{\"email\":\"" + who.email() + "\",\"role\":\"" + role + "\"}", 201);
    }

    @Test
    void scenarioA_fullWorkflowWithHistoryAndDashboard() throws Exception {
        Person owner = Person.fresh("Owner"), dev = Person.fresh("Dev");
        long ws = workspace(owner);
        addMember(owner, ws, dev, "MEMBER");
        long project = project(owner, ws, "Website");
        long devId = userId(dev);
        long task = task(owner, project, "Build login", "HIGH", devId);

        String moved = send(patch("/api/v1/tasks/" + task + "/status"), dev, "{\"status\":\"IN_PROGRESS\"}", 200);
        assertThat((String) JsonPath.read(moved, "$.status")).isEqualTo("IN_PROGRESS");

        String history = send(get("/api/v1/tasks/" + task + "/history"), dev, null, 200);
        assertThat((Integer) JsonPath.read(history, "$.totalElements")).isEqualTo(2);
        assertThat((String) JsonPath.read(history, "$.content[0].fieldName")).isEqualTo("status");
        assertThat((String) JsonPath.read(history, "$.content[0].oldValue")).isEqualTo("TODO");

        String dash = send(get("/api/v1/workspaces/" + ws + "/dashboard"), dev, null, 200);
        assertThat((Integer) JsonPath.read(dash, "$.totalTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.inProgressTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.completedTasks")).isZero();
        assertThat(((Number) JsonPath.read(dash, "$.completionPercentage")).doubleValue()).isZero();
        assertThat((Integer) JsonPath.read(dash, "$.totalProjects")).isEqualTo(1);
    }

    @Test
    void scenarioB_strangersCannotReachAnotherWorkspaceByGuessingIds() throws Exception {
        Person owner = Person.fresh("Owner"), stranger = Person.fresh("Stranger");
        long ws = workspace(owner);
        long project = project(owner, ws, "Private");
        long task = task(owner, project, "Secret", "LOW", null);
        userId(stranger);

        for (String path : new String[] {"/workspaces/" + ws, "/workspaces/" + ws + "/members", "/workspaces/" + ws + "/dashboard",
                "/workspaces/" + ws + "/projects", "/workspaces/" + ws + "/tasks", "/projects/" + project, "/projects/" + project + "/tasks",
                "/tasks/" + task, "/tasks/" + task + "/comments", "/tasks/" + task + "/history"}) {
            send(get("/api/v1" + path), stranger, null, 404);
        }
        send(post("/api/v1/tasks/" + task + "/comments"), stranger, "{\"content\":\"hi\"}", 404);
        send(patch("/api/v1/tasks/" + task + "/status"), stranger, "{\"status\":\"IN_PROGRESS\"}", 404);
        send(delete("/api/v1/tasks/" + task), stranger, null, 404);
        assertThat(send(get("/api/v1/workspaces"), stranger, null, 200)).isEqualTo("[]");
    }

    @Test
    void unauthenticatedRequestsGet401ProblemJson() throws Exception {
        mvc.perform(get("/api/v1/workspaces")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void rolesAreEnforcedOnTheServer() throws Exception {
        Person owner = Person.fresh("Owner"), lead = Person.fresh("Lead"), member = Person.fresh("Member");
        long ws = workspace(owner);
        addMember(owner, ws, lead, "LEAD");
        addMember(owner, ws, member, "MEMBER");
        long project = project(lead, ws, "By lead");                                    // lead may create projects
        send(post("/api/v1/workspaces/" + ws + "/projects"), member, "{\"name\":\"Nope\",\"startDate\":\"2026-11-01\"}", 403);
        long task = task(lead, project, "Work", "MEDIUM", userId(member));
        send(post("/api/v1/projects/" + project + "/tasks"), member, "{\"title\":\"x\",\"priority\":\"LOW\"}", 403);
        send(patch("/api/v1/tasks/" + task + "/assignee"), member, "{\"assigneeId\":" + userId(lead) + "}", 403);
        send(put("/api/v1/tasks/" + task), member, "{\"title\":\"x\",\"priority\":\"LOW\"}", 403);
        send(delete("/api/v1/tasks/" + task), member, null, 403);
        send(put("/api/v1/workspaces/" + ws), lead, "{\"name\":\"Renamed\"}", 403);
        send(post("/api/v1/workspaces/" + ws + "/members"), lead, "{\"email\":\"x@y.co\",\"role\":\"MEMBER\"}", 403);
        send(post("/api/v1/workspaces/" + ws + "/members"), owner, "{\"email\":\"" + member.email() + "\",\"role\":\"OWNER\"}", 400);
        send(post("/api/v1/tasks/" + task + "/comments"), member, "{\"content\":\"members can comment\"}", 201);
    }

    @Test
    void scenarioC_invalidTransitionIsRejectedAndNothingChanges() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long task = task(owner, project(owner, ws, "P"), "T", "LOW", null);
        send(patch("/api/v1/tasks/" + task + "/status"), owner, "{\"status\":\"DONE\"}", 409);
        assertThat((String) JsonPath.read(send(get("/api/v1/tasks/" + task), owner, null, 200), "$.status")).isEqualTo("TODO");
        assertThat((Integer) JsonPath.read(send(get("/api/v1/tasks/" + task + "/history"), owner, null, 200), "$.totalElements")).isEqualTo(1);
    }

    @Test
    void scenarioD_historyFailureRollsTheStatusChangeBack() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long task = task(owner, project(owner, ws, "P"), "T", "LOW", null);

        TaskHistoryService historyTarget = AopTestUtils.getUltimateTargetObject(historySpy);
        doThrow(new IllegalStateException("simulated history failure")).when(historyTarget).record(any(Task.class), any(), anyString(), any(), any());
        send(patch("/api/v1/tasks/" + task + "/status"), owner, "{\"status\":\"IN_PROGRESS\"}", 500);
        org.mockito.Mockito.reset(historyTarget);

        assertThat((String) JsonPath.read(send(get("/api/v1/tasks/" + task), owner, null, 200), "$.status")).isEqualTo("TODO");
    }

    @Test
    void validationErrorsUseTheProblemFormatWithFieldDetails() throws Exception {
        Person owner = Person.fresh("Owner");
        String body = send(post("/api/v1/workspaces"), owner, "{\"name\":\"\"}", 400);
        assertThat((String) JsonPath.read(body, "$.title")).isEqualTo("Validation Failed");
        assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("name");
    }

    @Test
    void duplicateProjectNamesConflict() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        project(owner, ws, "Same");
        send(post("/api/v1/workspaces/" + ws + "/projects"), owner, "{\"name\":\"same\",\"startDate\":\"2026-11-01\"}", 409);
    }

    @Test
    void filteringSortingAndPaginationHappenInTheDatabase() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long project = project(owner, ws, "P");
        task(owner, project, "low one", "LOW", null);
        task(owner, project, "urgent one", "URGENT", null);
        task(owner, project, "high one", "HIGH", null);

        String page = send(get("/api/v1/projects/" + project + "/tasks?sort=priority,desc&size=2"), owner, null, 200);
        assertThat((String) JsonPath.read(page, "$.content[0].priority")).isEqualTo("URGENT");
        assertThat((String) JsonPath.read(page, "$.content[1].priority")).isEqualTo("HIGH");
        assertThat((Integer) JsonPath.read(page, "$.totalElements")).isEqualTo(3);
        assertThat((Integer) JsonPath.read(page, "$.totalPages")).isEqualTo(2);

        String filtered = send(get("/api/v1/projects/" + project + "/tasks?priority=LOW"), owner, null, 200);
        assertThat((Integer) JsonPath.read(filtered, "$.totalElements")).isEqualTo(1);
        String searched = send(get("/api/v1/projects/" + project + "/tasks?q=URGENT"), owner, null, 200);
        assertThat((Integer) JsonPath.read(searched, "$.totalElements")).isEqualTo(1);

        send(get("/api/v1/projects/" + project + "/tasks?sort=password,asc"), owner, null, 400);
        String capped = send(get("/api/v1/projects/" + project + "/tasks?size=100000"), owner, null, 200);
        assertThat((Integer) JsonPath.read(capped, "$.size")).isEqualTo(100);
    }

    @Test
    void removingAMemberRevokesAccessAndClearsTheirAssignments() throws Exception {
        Person owner = Person.fresh("Owner"), dev = Person.fresh("Dev");
        long ws = workspace(owner);
        addMember(owner, ws, dev, "MEMBER");
        long task = task(owner, project(owner, ws, "P"), "T", "LOW", userId(dev));

        send(delete("/api/v1/workspaces/" + ws + "/members/" + userId(dev)), owner, null, 204);

        send(get("/api/v1/tasks/" + task), dev, null, 404);
        String after = send(get("/api/v1/tasks/" + task), owner, null, 200);
        assertThat((Object) JsonPath.read(after, "$.assignee")).isNull();
        String history = send(get("/api/v1/tasks/" + task + "/history"), owner, null, 200);
        assertThat((String) JsonPath.read(history, "$.content[0].fieldName")).isEqualTo("assignee");
    }

    @Test
    void archivedProjectsStayReadableButRefuseNewTasks() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long project = project(owner, ws, "Old");
        send(patch("/api/v1/projects/" + project + "/archive"), owner, null, 200);
        send(get("/api/v1/projects/" + project), owner, null, 200);
        send(post("/api/v1/projects/" + project + "/tasks"), owner, "{\"title\":\"x\",\"priority\":\"LOW\"}", 409);
    }

    @Test
    void deletedTasksDisappearButTheirHistoryIsKept() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long task = task(owner, project(owner, ws, "P"), "Gone soon", "LOW", null);
        send(delete("/api/v1/tasks/" + task), owner, null, 204);
        send(get("/api/v1/tasks/" + task), owner, null, 404);
    }

    @Test
    void dashboardCountsOverdueFromRealRows() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long project = project(owner, ws, "P");
        send(post("/api/v1/projects/" + project + "/tasks"), owner, "{\"title\":\"late\",\"priority\":\"LOW\",\"dueDate\":\"2020-01-01\"}", 201);
        send(post("/api/v1/projects/" + project + "/tasks"), owner, "{\"title\":\"fine\",\"priority\":\"LOW\"}", 201);
        String dash = send(get("/api/v1/workspaces/" + ws + "/dashboard"), owner, null, 200);
        assertThat((Integer) JsonPath.read(dash, "$.overdueTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.totalTasks")).isEqualTo(2);
        assertThat((Integer) JsonPath.read(dash, "$.tasksByStatus.TODO")).isEqualTo(2);
    }

    @Test
    void dashboardExposesWorkloadTrendAndMergedActivityFromRealRows() throws Exception {
        Person owner = Person.fresh("Owner"), dev = Person.fresh("Dev");
        long ws = workspace(owner);
        addMember(owner, ws, dev, "MEMBER");
        long project = project(owner, ws, "P");
        long done = task(owner, project, "finish me", "HIGH", userId(dev));
        task(owner, project, "still open", "LOW", userId(dev));
        task(owner, project, "nobody", "LOW", null);
        for (String s : new String[] {"IN_PROGRESS", "IN_REVIEW", "DONE"}) {
            send(patch("/api/v1/tasks/" + done + "/status"), owner, "{\"status\":\"" + s + "\"}", 200);
        }
        send(post("/api/v1/tasks/" + done + "/comments"), dev, "{\"content\":\"shipped\"}", 201);

        String dash = send(get("/api/v1/workspaces/" + ws + "/dashboard"), owner, null, 200);
        assertThat((Integer) JsonPath.read(dash, "$.completedTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.completedLast7Days")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.completedPrevious7Days")).isZero();
        assertThat((Integer) JsonPath.read(dash, "$.unassignedOpenTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.completionTrend.length()")).isEqualTo(14);
        assertThat((Integer) JsonPath.read(dash, "$.completionTrend[13].completed")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.workload.length()")).isEqualTo(2);
        assertThat((String) JsonPath.read(dash, "$.workload[0].fullName")).isEqualTo("Dev");
        assertThat((Integer) JsonPath.read(dash, "$.workload[0].openTasks")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(dash, "$.workload[0].completedTasks")).isEqualTo(1);
        assertThat((String) JsonPath.read(dash, "$.recentActivity[0].kind")).isEqualTo("comment");
        assertThat((String) JsonPath.read(dash, "$.projectProgress[0].createdBy.fullName")).isEqualTo("Owner");

        String members = send(get("/api/v1/workspaces/" + ws + "/members"), owner, null, 200);
        List<Map<String, Object>> memberRows = JsonPath.read(members, "$");
        Map<String, Object> devRow = memberRows.stream().filter(row -> "Dev".equals(row.get("fullName"))).findFirst().orElseThrow();
        assertThat(((Number) devRow.get("openTasks")).intValue()).isEqualTo(1);
    }

    @Test
    void workspaceTasksAndMyWorkSortByDueDateWithNullsLast() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long project = project(owner, ws, "P");
        long ownerId = userId(owner);
        send(post("/api/v1/projects/" + project + "/tasks"), owner,
                "{\"title\":\"due later\",\"priority\":\"LOW\",\"assigneeId\":" + ownerId + ",\"dueDate\":\"2026-11-22\"}", 201);
        send(post("/api/v1/projects/" + project + "/tasks"), owner,
                "{\"title\":\"due earlier\",\"priority\":\"LOW\",\"assigneeId\":" + ownerId + ",\"dueDate\":\"2026-11-21\"}", 201);
        task(owner, project, "no due date", "MEDIUM", ownerId);

        String tasks = send(get("/api/v1/workspaces/" + ws + "/tasks?sort=dueDate,asc"), owner, null, 200);
        assertThat((Integer) JsonPath.read(tasks, "$.totalElements")).isEqualTo(3);
        assertThat((String) JsonPath.read(tasks, "$.content[0].title")).isEqualTo("due earlier");
        assertThat((String) JsonPath.read(tasks, "$.content[1].title")).isEqualTo("due later");
        Object lastDueDate = JsonPath.read(tasks, "$.content[-1].dueDate");
        assertThat(lastDueDate).isNull();

        String myWork = send(get("/api/v1/workspaces/" + ws + "/tasks?assigneeId=" + ownerId + "&open=true&size=6&sort=dueDate,asc"), owner, null, 200);
        assertThat((Integer) JsonPath.read(myWork, "$.totalElements")).isEqualTo(3);
        assertThat((String) JsonPath.read(myWork, "$.content[0].title")).isEqualTo("due earlier");
    }

    @Test
    void workspaceTaskListSupportsOpenAndOverdueFilters() throws Exception {
        Person owner = Person.fresh("Owner");
        long ws = workspace(owner);
        long project = project(owner, ws, "P");
        send(post("/api/v1/projects/" + project + "/tasks"), owner, "{\"title\":\"late\",\"priority\":\"LOW\",\"dueDate\":\"2020-01-01\"}", 201);
        long ok = task(owner, project, "fine", "LOW", null);
        for (String s : new String[] {"IN_PROGRESS", "IN_REVIEW", "DONE"}) send(patch("/api/v1/tasks/" + ok + "/status"), owner, "{\"status\":\"" + s + "\"}", 200);
        assertThat((Integer) JsonPath.read(send(get("/api/v1/workspaces/" + ws + "/tasks?overdue=true"), owner, null, 200), "$.totalElements")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(send(get("/api/v1/workspaces/" + ws + "/tasks?open=true"), owner, null, 200), "$.totalElements")).isEqualTo(1);
        assertThat((Integer) JsonPath.read(send(get("/api/v1/workspaces/" + ws + "/tasks"), owner, null, 200), "$.totalElements")).isEqualTo(2);
    }
}
