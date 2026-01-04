# Yapidoo Events Service — Diagrams

This file contains Mermaid diagrams for the Events service as described in `migration-guide.md`.

---

## Class Diagram

```mermaid
classDiagram

class Event {
  +long Id
  +long CreatorUserId
  +string Title
  +string Description
  +bool IsVirtual
  +DateTime StartDate
  +DateTime EndDate
  +EventStatusEnum Status
  +PrivacyTypeEnum Privacy
  +string CoverMediaId
  +long LocationId
  +long CategoryId
}

class Venue {
  +string Street
  +string HouseNumber
}

class Location {
  +string Address
  +string City
  +string Region
  +string CountryName
  +string CountryCode
  +string District
  +double Latitude
  +double Longitude
  +string MapUrl
  +LocationTypeEnum Type
}

class Participation {
  +long EventId
  +long UserId
}

class Following {
  +long EventId
  +long UserId
}

class EventTimeline {
  +long EventId
  +DateTime StartedDate
  +DateTime FinishedDate
  +DateTime CanceledDate
  +DateTime InterruptedDate
}

class Condition {
  +long EventId
  +string Name
  +string Value
  +ConditionValueEnum ValueType
  +LogicEnum Logic
}

class EventHashtag {
  +long EventId
  +long HashtagId
}

class Hashtag {
  +long Id
  +string Title
}

class Category {
  +long Id
  +string Title
  +bool IsEnabled
}

class PrivacyTypeEnum {
  Public
  Friends
  Hidden
}

class EventStatusEnum {
  Planned
  Active
  Cancelled
  Interrupted
  Completed
}

class LocationTypeEnum {
  Text
  Coordinates
  MapUrl
}

class ConditionValueEnum {
  Boolean
  Digit
  String
}

class LogicEnum {
  And
  Or
  InList
  Contains
}

Venue --|> Location
Event "1" *-- "1" Venue : Location
Event "1" o-- "0..*" Participation : participants
Event "1" o-- "0..*" Following : followers
Event "1" o-- "0..*" Condition
Event "1" o-- "0..*" EventHashtag
EventHashtag "*" --> "1" Hashtag
Event "0..1" --> "1" Category
Event "0..1" --> "1" EventTimeline
```

---

## Use Case Diagram

```mermaid
flowchart LR
  actorUser([User])
  actorCreator([Event Creator])
  actorAdmin([Admin/Backoffice])

  ucBrowse((Browse/Search Events))
  ucGet((View Event Details))
  ucCreate((Create Event))
  ucUpdate((Update Event))
  ucCancel((Cancel Event))
  ucJoin((Join Event))
  ucLeave((Leave Event))

  actorUser --> ucBrowse
  actorUser --> ucGet
  actorUser --> ucJoin
  actorUser --> ucLeave

  actorCreator --> ucCreate
  actorCreator --> ucUpdate
  actorCreator --> ucCancel

  actorAdmin --> ucBrowse
  actorAdmin --> ucGet

  %% Authorization notes
  note1["AuthZ: events.read"]:::note
  note2["AuthZ: events.write"]:::note

  ucBrowse -.-> note1
  ucGet -.-> note1
  ucCreate -.-> note2
  ucUpdate -.-> note2
  ucCancel -.-> note2
  ucJoin -.-> note2
  ucLeave -.-> note2

  classDef note fill:#fff,stroke:#999,color:#333,stroke-dasharray: 3 3;
```

---

## Component Diagram

```mermaid
flowchart TB
  %% External actors/clients
  subgraph Clients
    SPA[Web SPA]
    Mobile[Mobile App]
  end

  %% Edge
  Gateway[API Gateway]

  %% Core services
  Auth["Auth Service (OpenIddict + JWKS)"]

  subgraph EventsService[Yapidoo.Service.Events]
    Api[Events.Api: Controllers + AuthZ + Health]
    UseCases[Events.UseCases: CQRS Handlers]
    Domain[Events.Domain: Aggregates + Domain Events]
    Data[Events.Data: EF Core DbContext + Migrations]
    Infra[Events.Infrastructure: Repositories + Outbox Publisher]
  end

  Db[(Events DB)]
  Bus[(Event Bus)]

  %% Other services
  Notifications[Notifications Service]
  Media[Media Service]

  %% Request flow
  SPA --> Gateway
  Mobile --> Gateway
  Gateway --> Api

  %% Auth
  Api --> Auth
  Gateway --> Auth

  %% Internal layering
  Api --> UseCases
  UseCases --> Domain
  UseCases --> Data
  Data --> Db
  UseCases --> Infra
  Infra --> Bus

  %% Integrations
  Bus --> Notifications
  Api -. "CoverMediaId" .-> Media

  %% Notes
  noteCORS["CORS at Gateway"]:::note
  Gateway -.-> noteCORS

  noteOutbox["Outbox: Persist integration events then publish asynchronously"]:::note
  Infra -.-> noteOutbox

  classDef note fill:#fff,stroke:#999,color:#333,stroke-dasharray: 3 3;
```
