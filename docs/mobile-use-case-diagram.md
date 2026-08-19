# SynergySphere Mobile App — Use-Case Diagram

This diagram represents the capabilities available through the Expo mobile application. It intentionally excludes web-only administration, AI, interview, portfolio, and lecture-material workflows.

```mermaid
flowchart LR
    Visitor["Visitor / prospective user"]
    Student["Student"]
    Organization["Organization user"]

    subgraph Mobile["SynergySphere mobile application"]
        direction TB

        subgraph Access["Account access"]
            Register(["Create account"])
            SignIn(["Sign in"])
            SignOut(["Sign out"])
            ViewProfile(["View profile and XP level"])
        end

        subgraph Progress["Learning and well-being"]
            ViewDashboard(["View progress dashboard"])
            ManageTasks(["Create and update tasks"])
            CheckIn(["Record wellness check-in"])
            ViewWellness(["View recent wellness history"])
        end

        subgraph Discovery["Discover opportunities"]
            BrowseChallenges(["Browse coding challenges"])
            BrowseProjects(["Browse community projects"])
        end

        subgraph Updates["Updates"]
            ViewNotifications(["View notifications"])
            MarkRead(["Mark notification as read"])
        end

        PersistSession(["Securely store mobile session"])
    end

    Visitor --> Register
    Visitor --> SignIn

    Student --> SignIn
    Student --> SignOut
    Student --> ViewProfile
    Student --> ViewDashboard
    Student --> ManageTasks
    Student --> CheckIn
    Student --> ViewWellness
    Student --> BrowseChallenges
    Student --> BrowseProjects
    Student --> ViewNotifications
    Student --> MarkRead

    Organization --> SignIn
    Organization --> SignOut
    Organization --> ViewProfile
    Organization --> ViewDashboard
    Organization --> BrowseChallenges
    Organization --> BrowseProjects
    Organization --> ViewNotifications
    Organization --> MarkRead

    Register -. "creates authenticated session" .-> PersistSession
    SignIn -. "creates authenticated session" .-> PersistSession
    MarkRead -. "requires" .-> ViewNotifications
    CheckIn -. "updates" .-> ViewDashboard
    ManageTasks -. "updates" .-> ViewDashboard
```

## Actor scope

| Actor | Mobile-app interaction |
| --- | --- |
| Visitor / prospective user | Creates an account or signs in. |
| Student | Uses the full implemented mobile learning, productivity, wellness, discovery, notification, and profile experience. |
| Organization user | Can authenticate and use the role-neutral mobile dashboard, discovery, notification, and profile flows. There is no organization-management screen in the current mobile client. |

Administrators are not shown because the current mobile application contains no administrator workflow; administration is handled outside the mobile scope.
