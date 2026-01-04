# Yapidoo Events Service — Event Aggregate Migration Instructions (.NET 9)

## Overview
This document provides comprehensive instructions for recreating the **Events** domain (Event aggregate + participation) in a new **Yapidoo** .NET 9 microservice, aligned with the platform approach used across this folder:

* **Microservice boundary** (Events owns Event + participants)
* **API Gateway** is the public front door
* **Auth service** is the identity authority (JWT validation via **JWKS**, offline)
* **DDD + CQRS** for domain behavior and clean separation of concerns
* **Event bus** for cross-service side effects (publish integration events)
* **Outbox + idempotent consumers** for reliable messaging

> Naming note: The original draft used `EventService.*`. Prefer `Yapidoo.Service.Events.*` for solution/projects/namespaces.

---

## 0. How This Service Fits Yapidoo

1. **Public access**
    * Mobile/Web clients call the **API Gateway**.
    * Gateway routes to `Yapidoo.Service.Events.Api`.

2. **Authentication & Authorization**
    * Events API validates JWT access tokens issued by `Yapidoo.Service.Auth`.
    * Validation is done using Auth discovery/JWKS (`/.well-known/openid-configuration`, `/.well-known/jwks.json`).
    * Use policy/scope-based authorization (e.g., `events.read`, `events.write`).

3. **Integration**
    * Events publishes integration events (e.g., `EventCreated`, `EventCancelled`, `EventParticipantJoined`) for Notifications and other consumers.
    * Avoid direct HTTP calls for cross-domain side effects where possible.

4. **Ops conventions**
    * Standard endpoints: `/healthz` and `/readyz`.
    * Structured logs + OpenTelemetry traces/metrics.

---

## 1. Project Structure

Create a new .NET 9 solution with the following projects:

```
Yapidoo.Service.Events/
??? Yapidoo.Service.Events.Domain/         # Domain layer (entities, aggregates, interfaces, domain events)
??? Yapidoo.Service.Events.UseCases/       # Application layer (CQRS handlers, DTOs)
??? Yapidoo.Service.Events.Data/           # EF Core DbContext + migrations
??? Yapidoo.Service.Events.Infrastructure/ # Messaging/outbox, repositories, external integrations
??? Yapidoo.Service.Events.Api/            # API layer (controllers, authN/authZ, health, startup)
```

### Create Projects
```bash
dotnet new sln -n Yapidoo.Service.Events
dotnet new classlib -n Yapidoo.Service.Events.Domain -f net9.0
dotnet new classlib -n Yapidoo.Service.Events.UseCases -f net9.0
dotnet new classlib -n Yapidoo.Service.Events.Data -f net9.0
dotnet new classlib -n Yapidoo.Service.Events.Infrastructure -f net9.0
dotnet new webapi -n Yapidoo.Service.Events.Api -f net9.0
dotnet sln add Yapidoo.Service.Events.Domain/Yapidoo.Service.Events.Domain.csproj
dotnet sln add Yapidoo.Service.Events.UseCases/Yapidoo.Service.Events.UseCases.csproj
dotnet sln add Yapidoo.Service.Events.Data/Yapidoo.Service.Events.Data.csproj
dotnet sln add Yapidoo.Service.Events.Infrastructure/Yapidoo.Service.Events.Infrastructure.csproj
dotnet sln add Yapidoo.Service.Events.Api/Yapidoo.Service.Events.Api.csproj
```

---

## 2. Domain Layer (Yapidoo.Service.Events.Domain)

### 2.1 Package Dependencies
```xml
<ItemGroup>
  <PackageReference Include="MediatR" Version="12.2.0" />
</ItemGroup>
```

> If the platform standardizes on `Yapidoo.Common.Mediator`, keep the domain events shape compatible (e.g., `INotification` style) and adapt in the UseCases layer.

### 2.2 SeedWork (Base Classes)

#### Entity.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

using MediatR;

public abstract class Entity
{
    private int? _requestedHashCode;
    private long _id;
    
    public virtual long Id 
    {
        get => _id;
        protected set => _id = value;
    }

    private List<INotification>? _domainEvents;
    public IReadOnlyCollection<INotification>? DomainEvents => _domainEvents?.AsReadOnly();

    public void AddDomainEvent(INotification eventItem)
    {
        _domainEvents ??= new List<INotification>();
        _domainEvents.Add(eventItem);
    }

    public void RemoveDomainEvent(INotification eventItem)
    {
        _domainEvents?.Remove(eventItem);
    }

    public void ClearDomainEvents()
    {
        _domainEvents?.Clear();
    }

    public bool IsTransient() => Id == default;

    public override bool Equals(object? obj)
    {
        if (obj is not Entity entity)
            return false;

        if (ReferenceEquals(this, obj))
            return true;

        if (GetType() != obj.GetType())
            return false;

        if (entity.IsTransient() || IsTransient())
            return false;

        return entity.Id == Id;
    }

    public override int GetHashCode()
    {
        if (!IsTransient())
        {
            _requestedHashCode ??= Id.GetHashCode() ^ 33;
            return _requestedHashCode.Value;
        }
        return base.GetHashCode();
    }

    public static bool operator ==(Entity? left, Entity? right)
    {
        return Equals(left, null) ? Equals(right, null) : left.Equals(right);
    }

    public static bool operator !=(Entity? left, Entity? right)
    {
        return !(left == right);
    }
}
```

#### AuditableEntity.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

public abstract class AuditableEntity : Entity
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long CreatedBy { get; set; }
    public DateTime EditedAt { get; set; } = DateTime.UtcNow;
    public long EditedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long DeletedBy { get; set; }
}
```

#### IAggregateRoot.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

public interface IAggregateRoot
{
    long Id { get; }
}
```

#### ValueObject.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

public abstract class ValueObject
{
    protected static bool EqualOperator(ValueObject? left, ValueObject? right)
    {
        if (ReferenceEquals(left, null) ^ ReferenceEquals(right, null))
            return false;
        return ReferenceEquals(left, null) || left.Equals(right);
    }

    protected static bool NotEqualOperator(ValueObject? left, ValueObject? right)
    {
        return !EqualOperator(left, right);
    }

    protected abstract IEnumerable<object> GetAtomicValues();

    public override bool Equals(object? obj)
    {
        if (obj == null || obj.GetType() != GetType())
            return false;

        var other = (ValueObject)obj;
        var thisValues = GetAtomicValues().GetEnumerator();
        var otherValues = other.GetAtomicValues().GetEnumerator();

        while (thisValues.MoveNext() && otherValues.MoveNext())
        {
            if (ReferenceEquals(thisValues.Current, null) ^ ReferenceEquals(otherValues.Current, null))
                return false;

            if (thisValues.Current != null && !thisValues.Current.Equals(otherValues.Current))
                return false;
        }

        return !thisValues.MoveNext() && !otherValues.MoveNext();
    }

    public override int GetHashCode()
    {
        return GetAtomicValues()
            .Select(x => x?.GetHashCode() ?? 0)
            .Aggregate((x, y) => x ^ y);
    }

    public ValueObject GetCopy()
    {
        return (MemberwiseClone() as ValueObject)!;
    }
}
```

#### IRepository.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

using System.Linq.Expressions;

public interface IRepository<T> where T : Entity
{
    IUnitOfWork UnitOfWork { get; }
    T Add(T entity);
    T Update(T entity);
    bool Delete(T entity);
    IQueryable<T> Get();
    T? GetById(long id);
    IQueryable<T> Get(Expression<Func<T, bool>> predicate);
}
```

#### IUnitOfWork.cs
```csharp
namespace Yapidoo.Service.Events.Domain.SeedWork;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<bool> SaveEntitiesAsync(CancellationToken cancellationToken = default);
}
```

### 2.3 Enumerations

#### EventEnums.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Enums;

public enum PrivacyTypeEnum
{
    Public = 1,
    Friends = 2,
    Hidden = 3
}

public enum EventStatusEnum
{
    Planned = 1,
    Active = 2,
    Cancelled = 3,
    Interrupted = 4,
    Completed = 5,
}

public enum ConditionValueEnum
{
    Boolean = 1,
    Digit = 2,
    String = 3
}

public enum LogicEnum
{
    And = 1,
    Or = 2,
    InList = 3,
    Contains = 4,
}

public enum LocationTypeEnum
{
    Text = 0,
    Coordinates = 1,
    MapUrl = 2,
}
```

### 2.4 Common Entities

#### Location.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Common;

using Yapidoo.Service.Events.Domain.SeedWork;
using Yapidoo.Service.Events.Domain.Enums;

public class Location : AuditableEntity
{
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? CountryName { get; set; }
    public string? CountryCode { get; set; }
    public string? District { get; set; }
    public double? Longitude { get; set; }
    public double? Latitude { get; set; }
    public string? MapUrl { get; set; }
    public LocationTypeEnum Type { get; set; }
}
```

### 2.5 Event Aggregate

#### Event.cs (Aggregate Root)
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;
using Yapidoo.Service.Events.Domain.Enums;
using Yapidoo.Service.Events.Domain.DomainEvents;

public class Event : AuditableEntity, IAggregateRoot
{
    // Primitive Properties
    public string Title { get; set; } = string.Empty;
    public long CreatorUserId { get; set; }
    public bool IsVirtual { get; set; }
    public string? Description { get; set; }
    public string? CoverMediaId { get; internal set; }
    
    // Status & Dates
    public EventStatusEnum Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? CanceledDate { get; set; }
    public DateTime? InterruptedDate { get; set; }
    
    // Foreign Keys
    public long LocationId { get; set; }
    public long? CategoryId { get; set; }
    
    // Navigation Properties
    public Venue Location { get; set; } = null!;
    public Category? Category { get; set; }
    public EventTimeline? Timeline { get; set; }
    
    // Privacy
    public PrivacyTypeEnum Privacy { get; set; }
    
    // Collections
    public ICollection<Condition> Conditions { get; set; } = new List<Condition>();
    public ICollection<EventHashtag> EventHashtags { get; set; } = new List<EventHashtag>();
    public ICollection<Participation> Participations { get; set; } = new List<Participation>();
    public ICollection<Following> FollowingProfiles { get; set; } = new List<Following>();

    // Factory Method
    public static Event Create(
        string title,
        string description,
        bool isVirtual,
        string address,
        DateTime startAt,
        DateTime endDate,
        long creatorUserId,
        int categoryId,
        string privacy)
    {
        var newEvent = new Event
        {
            CreatorUserId = creatorUserId,
            IsVirtual = isVirtual,
            Title = title,
            Description = description,
            Location = new Venue { Address = address, Type = LocationTypeEnum.Text },
            Privacy = Enum.Parse<PrivacyTypeEnum>(privacy),
            StartDate = startAt,
            EndDate = endDate,
            CategoryId = categoryId,
            Status = EventStatusEnum.Planned
        };
        
        return newEvent;
    }

    // Domain Methods
    public void AddEventCreatedDomainEvent()
    {
        var eventCreatedDomainEvent = new EventCreatedDomainEvent(this, CreatorUserId);
        AddDomainEvent(eventCreatedDomainEvent);
    }

    public void SetStatus(EventStatusEnum newStatus)
    {
        Status = newStatus;
    }
}
```

#### Event Extensions (EventExtensions.cs)
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.Enums;

public static class EventExtensions
{
    public static Event WithPrivacy(this Event that, PrivacyTypeEnum privacy)
    {
        that.Privacy = privacy;
        return that;
    }

    public static Event WithGeocoordinates(this Event that, double latitude, double longitude)
    {
        that.Location.Latitude = latitude;
        that.Location.Longitude = longitude;
        return that;
    }

    public static Event WithAddress(this Event that, string address)
    {
        that.Location.Address = address;
        return that;
    }

    public static Event WithLocation(
        this Event that,
        string address,
        double latitude,
        double longitude,
        string mapUrl,
        LocationTypeEnum type)
    {
        that.WithAddress(address).WithGeocoordinates(latitude, longitude);
        that.Location.MapUrl = mapUrl;
        that.Location.Type = type;
        return that;
    }

    public static Event WithCoverMedia(this Event that, string? coverMediaId)
    {
        if (!string.IsNullOrWhiteSpace(coverMediaId))
        {
            that.CoverMediaId = coverMediaId;
        }
        return that;
    }
}
```

#### Venue.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.Common;

public class Venue : Location
{
    public string? Street { get; set; }
    public string? HouseNumber { get; set; }
    public ICollection<Event> Events { get; set; } = new List<Event>();
}
```

#### Participation.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class Participation : AuditableEntity
{
    public long EventId { get; set; }
    public long UserId { get; set; }
    public Event Event { get; set; } = null!;
    // Note: Users/Profile data is owned by Users service.
    // Store only the user identity key here.
}
```

#### Following.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class Following : AuditableEntity
{
    public long EventId { get; set; }
    public long UserId { get; set; }
    public Event Event { get; set; } = null!;
    // Note: Users/Profile data is owned by Users service.
}
```

#### Condition.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;
using Yapidoo.Service.Events.Domain.Enums;

public class Condition : Entity
{
    public long EventId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public ConditionValueEnum ValueType { get; private set; }
    public LogicEnum Logic { get; private set; }
}
```

#### EventTimeline.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class EventTimeline : Entity
{
    public long EventId { get; private set; }
    public DateTime? StartedDate { get; private set; }
    public DateTime? FinishedDate { get; private set; }
    public DateTime? CanceledDate { get; private set; }
    public DateTime? InterruptedDate { get; private set; }
}
```

#### EventHashtag.cs (Many-to-Many Relation)
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class EventHashtag : Entity, IAggregateRoot
{
    public long EventId { get; set; }
    public Event Event { get; set; } = null!;
    public long HashtagId { get; set; }
    public Hashtag Hashtag { get; set; } = null!;
}
```

#### Hashtag.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class Hashtag : ValueObject
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public ICollection<EventHashtag> EventHashtags { get; set; } = new List<EventHashtag>();

    protected override IEnumerable<object> GetAtomicValues()
    {
        yield return Title;
    }
}
```

#### Category.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.CategoryAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public class Category : AuditableEntity, IAggregateRoot
{
    public string Title { get; set; } = string.Empty;
    public string? TitleUa { get; set; }
    public string? Description { get; set; }
    public string? DescriptionUa { get; set; }
    public bool IsEnabled { get; set; }
    public string? ImageUrl { get; set; }
    public string? SmallImageUrl { get; set; }
    public string? Icon { get; set; }
    public long? ParentCategoryId { get; set; }
    // public SuperCategory? ParentCategory { get; set; }
}
```

### 2.6 Domain Events

#### EventCreatedDomainEvent.cs
```csharp
namespace Yapidoo.Service.Events.Domain.DomainEvents;

using MediatR;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

public class EventCreatedDomainEvent : INotification
{
    public long CreatorUserId { get; }
    public Event Event { get; }

    public EventCreatedDomainEvent(Event @event, long creatorUserId)
    {
        CreatorUserId = creatorUserId;
        Event = @event;
    }
}
```

### 2.7 Repository Interfaces

#### IEventRepository.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public interface IEventRepository : IRepository<Event>
{
    Task<bool> CreateWithVenue(Event newEvent);
}
```

#### IVenueRepository.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public interface IVenueRepository : IRepository<Venue>
{
}
```

#### IEventHashtagRepository.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

using Yapidoo.Service.Events.Domain.SeedWork;

public interface IEventHashtagRepository : IRepository<EventHashtag>
{
}
```

### 2.8 Domain Exceptions

#### EventDomainException.cs
```csharp
namespace Yapidoo.Service.Events.Domain.Exceptions;

public class EventDomainException : Exception
{
    public EventDomainException()
    { }

    public EventDomainException(string message)
        : base(message)
    { }

    public EventDomainException(string message, Exception innerException)
        : base(message, innerException)
    { }
}
```

---

## 3. Data & Infrastructure Layers (Yapidoo.Service.Events.Data + Yapidoo.Service.Events.Infrastructure)

### 3.1 Package Dependencies
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="9.0.0" />
</ItemGroup>
<ItemGroup>
    <ProjectReference Include="..\Yapidoo.Service.Events.Domain\Yapidoo.Service.Events.Domain.csproj" />
</ItemGroup>
```

### 3.2 DbContext

#### EventDbContext.cs
```csharp
namespace Yapidoo.Service.Events.Data;

using Microsoft.EntityFrameworkCore;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Domain.Aggregates.CategoryAggregate;
using Yapidoo.Service.Events.Domain.SeedWork;
using MediatR;

public class EventDbContext : DbContext, IUnitOfWork
{
    private readonly IMediator _mediator;

    public DbSet<Event> Events { get; set; } = null!;
    public DbSet<Venue> Venues { get; set; } = null!;
    public DbSet<Participation> Participations { get; set; } = null!;
    public DbSet<Following> Followings { get; set; } = null!;
    public DbSet<Condition> Conditions { get; set; } = null!;
    public DbSet<EventTimeline> EventTimelines { get; set; } = null!;
    public DbSet<EventHashtag> EventHashtags { get; set; } = null!;
    public DbSet<Hashtag> Hashtags { get; set; } = null!;
    public DbSet<Category> Categories { get; set; } = null!;

    public EventDbContext(DbContextOptions<EventDbContext> options, IMediator mediator)
        : base(options)
    {
        _mediator = mediator;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(EventDbContext).Assembly);
    }

    public async Task<bool> SaveEntitiesAsync(CancellationToken cancellationToken = default)
    {
        // Dispatch Domain Events collection
        await DispatchDomainEventsAsync();

        // After executing this line all the changes (from the Command Handler and Domain Event Handlers) 
        // performed through the DbContext will be committed
        var result = await base.SaveChangesAsync(cancellationToken);

        return true;
    }

    private async Task DispatchDomainEventsAsync()
    {
        var domainEntities = ChangeTracker
            .Entries<Entity>()
            .Where(x => x.Entity.DomainEvents != null && x.Entity.DomainEvents.Any())
            .ToList();

        var domainEvents = domainEntities
            .SelectMany(x => x.Entity.DomainEvents!)
            .ToList();

        domainEntities.ForEach(entity => entity.Entity.ClearDomainEvents());

        foreach (var domainEvent in domainEvents)
            await _mediator.Publish(domainEvent);
    }
}
```

### 3.2.1 Outbox & Integration Events (Recommended)

To align with the Yapidoo microservice approach (reliable eventing and loose coupling):

1. **Persist integration events with the same DB transaction** as the domain change (Outbox table).
2. **Publish asynchronously** from a background worker (or a hosted service) that reads undispatched outbox rows.
3. Make consumers **idempotent** (use an `EventId`/dedupe key per message) to tolerate redeliveries.

Suggested integration events emitted by Events:

* `EventCreated { EventId, CreatorUserId, StartDate, LocationSummary, Privacy }`
* `EventCancelled { EventId, CreatorUserId, CancelledAt }`
* `EventParticipantJoined { EventId, UserId }`
* `EventParticipantLeft { EventId, UserId }`

### 3.3 Entity Configurations

#### EventEntityTypeConfiguration.cs
```csharp
namespace Yapidoo.Service.Events.Data.EntityConfigurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;

internal class EventEntityTypeConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events");
        builder.HasKey(e => e.Id);
        
        builder.Property(e => e.Title)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(e => e.Privacy)
            .IsRequired()
            .HasConversion<int>();

        builder.HasOne(x => x.Location)
            .WithMany(l => l.Events)
            .HasForeignKey(e => e.LocationId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.Conditions)
            .WithOne()
            .HasForeignKey(x => x.EventId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Participations)
            .WithOne(p => p.Event)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.FollowingProfiles)
            .WithOne(f => f.Event)
            .HasForeignKey(x => x.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Timeline)
            .WithOne()
            .HasForeignKey<EventTimeline>(x => x.EventId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Category)
            .WithMany()
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasMany(x => x.EventHashtags)
            .WithOne(eh => eh.Event)
            .HasForeignKey(eh => eh.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### 3.4 Repository Implementation

#### Repository.cs (Base Repository)
```csharp
namespace Yapidoo.Service.Events.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using Yapidoo.Service.Events.Domain.SeedWork;
using Yapidoo.Service.Events.Data;
using System.Linq.Expressions;

public class Repository<T> : IRepository<T> where T : Entity
{
    protected readonly EventDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public IUnitOfWork UnitOfWork => _context;

    public Repository(EventDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual T Add(T entity)
    {
        return _dbSet.Add(entity).Entity;
    }

    public virtual T Update(T entity)
    {
        return _dbSet.Update(entity).Entity;
    }

    public virtual bool Delete(T entity)
    {
        _dbSet.Remove(entity);
        return true;
    }

    public virtual IQueryable<T> Get()
    {
        return _dbSet.AsQueryable();
    }

    public virtual T? GetById(long id)
    {
        return _dbSet.FirstOrDefault(x => x.Id == id);
    }

    public virtual IQueryable<T> Get(Expression<Func<T, bool>> predicate)
    {
        return _dbSet.Where(predicate);
    }
}
```

#### EventRepository.cs
```csharp
namespace Yapidoo.Service.Events.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Data;

public class EventRepository : Repository<Event>, IEventRepository
{
    public EventRepository(EventDbContext context) : base(context)
    {
    }

    public async Task<bool> CreateWithVenue(Event newEvent)
    {
        if (newEvent == null)
            return false;

        if (newEvent.Location != null)
        {
            _context.Venues.Add(newEvent.Location);
        }

        Add(newEvent);
        return await UnitOfWork.SaveChangesAsync() > 0;
    }

    public override Event? GetById(long id)
    {
        return _dbSet
            .Include(x => x.Participations)
            .Include(x => x.Location)
            .Include(x => x.Category)
            .FirstOrDefault(x => x.Id == id);
    }
}
```

#### VenueRepository.cs
```csharp
namespace Yapidoo.Service.Events.Infrastructure.Repositories;

using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Data;

public class VenueRepository : Repository<Venue>, IVenueRepository
{
    public VenueRepository(EventDbContext context) : base(context)
    {
    }
}
```

#### EventHashtagRepository.cs
```csharp
namespace Yapidoo.Service.Events.Infrastructure.Repositories;

using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Data;

public class EventHashtagRepository : Repository<EventHashtag>, IEventHashtagRepository
{
    public EventHashtagRepository(EventDbContext context) : base(context)
    {
    }
}
```

---

## 4. UseCases Layer (Yapidoo.Service.Events.UseCases)

### 4.1 Package Dependencies
```xml
<ItemGroup>
  <PackageReference Include="MediatR" Version="12.2.0" />
  <PackageReference Include="AutoMapper" Version="13.0.1" />
  <PackageReference Include="FluentValidation" Version="11.9.0" />
  <PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="11.9.0" />
</ItemGroup>
<ItemGroup>
    <ProjectReference Include="..\Yapidoo.Service.Events.Domain\Yapidoo.Service.Events.Domain.csproj" />
</ItemGroup>
```

### 4.2 Commands

#### CreateEventCommand.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Commands;

using MediatR;
using Yapidoo.Service.Events.UseCases.DTOs;

public class CreateEventCommand : IRequest<EventViewModel>
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public EventLocationDTO Location { get; set; } = null!;
    public bool IsVirtual { get; set; }
    public int CategoryId { get; set; }
    public int SubCategoryId { get; set; }
    public string Privacy { get; set; } = string.Empty;
    public string[]? Hashtags { get; set; }
    public string? CoverMediaId { get; set; }
    
    // User context (resolved from the validated JWT, set by middleware/pipeline)
    public long CreatorUserId { get; set; }
}
```

#### UpdateEventCommand.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Commands;

using MediatR;
using Yapidoo.Service.Events.UseCases.DTOs;

public class UpdateEventCommand : IRequest<EventViewModel>
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public EventLocationDTO Location { get; set; } = null!;
    public string Privacy { get; set; } = string.Empty;
    public string? CoverMediaId { get; set; }
}
```

#### ParticipateEventCommand.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Commands;

using MediatR;

public class ParticipateEventCommand : IRequest<bool>
{
    public long EventId { get; set; }
    public long UserId { get; set; }
    public ParticipationType ParticipationType { get; set; }
}

public enum ParticipationType
{
    Join,
    Leave
}
```

### 4.3 Command Handlers

#### CreateEventCommandHandler.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Handlers;

using MediatR;
using AutoMapper;
using Microsoft.Extensions.Logging;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Domain.Exceptions;
using Yapidoo.Service.Events.UseCases.Commands;
using Yapidoo.Service.Events.UseCases.DTOs;
using Yapidoo.Service.Events.UseCases.Validators;

public class CreateEventCommandHandler : IRequestHandler<CreateEventCommand, EventViewModel>
{
    private readonly IMapper _mapper;
    private readonly IMediator _mediator;
    private readonly IEventRepository _eventRepository;
    private readonly IEventHashtagRepository _eventHashtagRepository;
    private readonly IVenueRepository _venueRepository;
    private readonly ILogger<CreateEventCommandHandler> _logger;

    public CreateEventCommandHandler(
        IEventRepository eventRepository,
        IEventHashtagRepository eventHashtagRepository,
        IVenueRepository venueRepository,
        IMediator mediator,
        ILogger<CreateEventCommandHandler> logger,
        IMapper mapper)
    {
        _eventRepository = eventRepository;
        _mediator = mediator;
        _eventHashtagRepository = eventHashtagRepository;
        _venueRepository = venueRepository;
        _logger = logger;
        _mapper = mapper;
    }

    public async Task<EventViewModel> Handle(CreateEventCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var validator = new CreateEventCommandValidator();
            var validationResult = await validator.ValidateAsync(request, cancellationToken);
            
            if (!validationResult.IsValid)
            {
                throw new EventDomainException(
                    string.Join(";", validationResult.Errors.Select(x => x.ErrorMessage)));
            }

            var @event = _mapper.Map<Event>(request);
            var venue = _mapper.Map<Venue>(request.Location);
            
            _venueRepository.Add(venue);
            @event.Location = venue;
            @event.CreatorUserId = request.CreatorUserId;
            @event.WithCoverMedia(request.CoverMediaId);

            AddHashtags(@event, request.Hashtags);

            if (await _eventRepository.CreateWithVenue(@event))
            {
                var vm = _mapper.Map<EventViewModel>(@event);
                vm.Location = _mapper.Map<LocationViewModel>(@event.Location);
                return vm;
            }
            
            throw new EventDomainException("Error on Event Creation");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on event creation: {Message}", ex.Message);
            throw;
        }
    }

    private void AddHashtags(Event @event, string[]? hashtags)
    {
        if (hashtags == null || hashtags.Length == 0)
            return;

        foreach (var tag in hashtags)
        {
            // Implementation depends on hashtag handling strategy
            // Could search for existing hashtags or create new ones
        }
    }
}
```

#### UpdateEventCommandHandler.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Handlers;

using MediatR;
using AutoMapper;
using Microsoft.Extensions.Logging;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.Domain.Exceptions;
using Yapidoo.Service.Events.UseCases.Commands;
using Yapidoo.Service.Events.UseCases.DTOs;

public class UpdateEventCommandHandler : IRequestHandler<UpdateEventCommand, EventViewModel>
{
    private readonly IMapper _mapper;
    private readonly IEventRepository _eventRepository;
    private readonly IVenueRepository _venueRepository;
    private readonly ILogger<UpdateEventCommandHandler> _logger;

    public UpdateEventCommandHandler(
        IEventRepository eventRepository,
        IVenueRepository venueRepository,
        ILogger<UpdateEventCommandHandler> logger,
        IMapper mapper)
    {
        _eventRepository = eventRepository;
        _venueRepository = venueRepository;
        _logger = logger;
        _mapper = mapper;
    }

    public async Task<EventViewModel> Handle(UpdateEventCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var dbEvent = _eventRepository.GetById(request.Id);
            if (dbEvent == null)
            {
                throw new EventDomainException($"Event with id {request.Id} was not found");
            }

            var venue = _mapper.Map<Venue>(request.Location);

            dbEvent.Title = request.Title;
            dbEvent.Description = request.Description;
            dbEvent.StartDate = request.StartDate;
            dbEvent.EndDate = request.EndDate;
            dbEvent.Privacy = Enum.Parse<Domain.Enums.PrivacyTypeEnum>(request.Privacy);

            var dbLocation = _venueRepository.GetById(dbEvent.LocationId);
            if (dbLocation != null)
            {
                dbLocation.Address = venue.Address;
                dbLocation.Latitude = venue.Latitude;
                dbLocation.Longitude = venue.Longitude;
                dbLocation.MapUrl = venue.MapUrl;
                dbLocation.Type = venue.Type;
                _venueRepository.Update(dbLocation);
            }

            dbEvent.WithCoverMedia(request.CoverMediaId);

            _eventRepository.Update(dbEvent);
            
            if (await _eventRepository.UnitOfWork.SaveChangesAsync(cancellationToken) > 0)
            {
                return _mapper.Map<EventViewModel>(dbEvent);
            }
            
            throw new EventDomainException("Error on Event Update");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error on event update: {Message}", ex.Message);
            throw;
        }
    }
}
```

### 4.4 Domain Event Handlers

#### NotifyInvitedOnEventCreatedHandler.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.DomainEventHandlers;

using MediatR;
using Microsoft.Extensions.Logging;
using Yapidoo.Service.Events.Domain.DomainEvents;

public class NotifyInvitedOnEventCreatedHandler : INotificationHandler<EventCreatedDomainEvent>
{
    private readonly ILogger<NotifyInvitedOnEventCreatedHandler> _logger;

    public NotifyInvitedOnEventCreatedHandler(ILogger<NotifyInvitedOnEventCreatedHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(EventCreatedDomainEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Event creator {CreatorUserId} has created event with Title: {Title}",
            notification.CreatorUserId,
            notification.Event.Title);

        // Add notification logic here (e.g., send to message queue, notification service)
        
        return Task.CompletedTask;
    }
}
```

### 4.5 Validators

#### CreateEventCommandValidator.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Validators;

using FluentValidation;
using Yapidoo.Service.Events.UseCases.Commands;

public class CreateEventCommandValidator : AbstractValidator<CreateEventCommand>
{
    public CreateEventCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required")
            .GreaterThanOrEqualTo(DateTime.UtcNow).WithMessage("Start date must be in the future");

        RuleFor(x => x.EndDate)
            .GreaterThan(x => x.StartDate).WithMessage("End date must be after start date");

        RuleFor(x => x.Location)
            .NotNull().WithMessage("Location is required");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Category is required");

        RuleFor(x => x.Privacy)
            .NotEmpty().WithMessage("Privacy setting is required")
            .Must(p => new[] { "Public", "Hidden", "Friends" }.Contains(p))
            .WithMessage("Privacy must be Public, Hidden, or Friends");
    }
}
```

### 4.6 DTOs

#### EventViewModel.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.DTOs;

public class EventViewModel
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsVirtual { get; set; }
    public string Privacy { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CoverMediaId { get; set; }
    public long CreatorUserId { get; set; }
    public LocationViewModel? Location { get; set; }
    public CategoryViewModel? Category { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public int ParticipantsCount { get; set; }
    public int FollowersCount { get; set; }
}
```

#### EventLocationDTO.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.DTOs;

public class EventLocationDTO
{
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? MapUrl { get; set; }
    public string Type { get; set; } = "Text";
}
```

#### LocationViewModel.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.DTOs;

public class LocationViewModel
{
    public long Id { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? MapUrl { get; set; }
    public string Type { get; set; } = string.Empty;
}
```

#### CategoryViewModel.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.DTOs;

public class CategoryViewModel
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Icon { get; set; }
}
```

### 4.7 AutoMapper Profile

#### MappingProfile.cs
```csharp
namespace Yapidoo.Service.Events.UseCases.Mappings;

using AutoMapper;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.UseCases.Commands;
using Yapidoo.Service.Events.UseCases.DTOs;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Command to Entity
        CreateMap<CreateEventCommand, Event>()
            .ForMember(dest => dest.Location, opt => opt.Ignore())
            .ForMember(dest => dest.Privacy, opt => opt.MapFrom(src => 
                Enum.Parse<Domain.Enums.PrivacyTypeEnum>(src.Privacy)));

        CreateMap<UpdateEventCommand, Event>()
            .ForMember(dest => dest.Location, opt => opt.Ignore());

        // DTO Mappings
        CreateMap<EventLocationDTO, Venue>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => 
                Enum.Parse<Domain.Enums.LocationTypeEnum>(src.Type)));

        // Entity to ViewModel
        CreateMap<Event, EventViewModel>()
            .ForMember(dest => dest.Privacy, opt => opt.MapFrom(src => src.Privacy.ToString()))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.CreatorUserId, opt => opt.MapFrom(src => src.CreatorUserId))
            .ForMember(dest => dest.CoverMediaId, opt => opt.MapFrom(src => src.CoverMediaId))
            .ForMember(dest => dest.Hashtags, opt => opt.MapFrom(src => 
                src.EventHashtags.Select(eh => eh.Hashtag.Title)))
            .ForMember(dest => dest.ParticipantsCount, opt => opt.MapFrom(src => 
                src.Participations.Count))
            .ForMember(dest => dest.FollowersCount, opt => opt.MapFrom(src => 
                src.FollowingProfiles.Count));

        CreateMap<Venue, LocationViewModel>()
            .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()));

        CreateMap<Domain.Aggregates.CategoryAggregate.Category, CategoryViewModel>();
    }
}
```

---

## 5. API Layer (Yapidoo.Service.Events.Api)

### 5.1 Package Dependencies
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
  <PackageReference Include="Swashbuckle.AspNetCore" Version="6.8.0" />
  <PackageReference Include="MediatR" Version="12.2.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.0" />
    <PackageReference Include="Microsoft.Extensions.Diagnostics.HealthChecks" Version="9.0.0" />
    <PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.10.0" />
    <PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.10.0" />
    <PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
</ItemGroup>
<ItemGroup>
    <ProjectReference Include="..\Yapidoo.Service.Events.UseCases\Yapidoo.Service.Events.UseCases.csproj" />
    <ProjectReference Include="..\Yapidoo.Service.Events.Infrastructure\Yapidoo.Service.Events.Infrastructure.csproj" />
    <ProjectReference Include="..\Yapidoo.Service.Events.Data\Yapidoo.Service.Events.Data.csproj" />
</ItemGroup>
```

### 5.2 Controller

#### EventsController.cs
```csharp
namespace Yapidoo.Service.Events.Api.Controllers;

using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Yapidoo.Service.Events.UseCases.Commands;
using Yapidoo.Service.Events.UseCases.DTOs;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<EventsController> _logger;

    public EventsController(IMediator mediator, ILogger<EventsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Create New Event
    /// </summary>
    /// <param name="command">Create Event Model</param>
    /// <returns>Created Event Model</returns>
    [HttpPost]
    [Authorize(Policy = "events.write")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(EventViewModel))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<EventViewModel>> Create([FromBody] CreateEventCommand command)
    {
        // Populate creator from JWT (e.g., sub/user_id claim) in middleware or here.
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Update Event
    /// </summary>
    /// <param name="id">Event Id</param>
    /// <param name="command">Update Event Model</param>
    /// <returns>Updated Event Model</returns>
    [HttpPut("{id:long}")]
    [Authorize(Policy = "events.write")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(EventViewModel))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<EventViewModel>> Update(long id, [FromBody] UpdateEventCommand command)
    {
        command.Id = id;
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Get Event By Id
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Policy = "events.read")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(EventViewModel))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventViewModel>> GetById(long id)
    {
        // Implement GetEventQuery and handler
        return Ok();
    }

    /// <summary>
    /// Join an event
    /// </summary>
    [HttpPost("{id:long}/join")]
    [Authorize(Policy = "events.write")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<bool>> Join(long id)
    {
        var command = new ParticipateEventCommand
        {
            EventId = id,
            ParticipationType = ParticipationType.Join,
            // UserId should be populated from JWT context
        };

        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Leave an event
    /// </summary>
    [HttpPost("{id:long}/leave")]
    [Authorize(Policy = "events.write")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<bool>> Leave(long id)
    {
        var command = new ParticipateEventCommand
        {
            EventId = id,
            ParticipationType = ParticipationType.Leave,
            // UserId should be populated from JWT context
        };

        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
```

### 5.3 Program.cs (Startup Configuration)

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Yapidoo.Service.Events.Data;
using Yapidoo.Service.Events.Infrastructure.Repositories;
using Yapidoo.Service.Events.Domain.Aggregates.EventAggregate;
using Yapidoo.Service.Events.UseCases.Mappings;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration));

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Yapidoo Events API", Version = "v1" });
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

// Database
builder.Services.AddDbContext<EventDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.MigrationsAssembly(typeof(EventDbContext).Assembly.FullName);
            sqlOptions.EnableRetryOnFailure(maxRetryCount: 15, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null);
        });
});

// AuthN: Validate JWTs issued by Yapidoo.Service.Auth using OIDC metadata/JWKS
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"]; // e.g. https://auth.yapidoo.com
        options.RequireHttpsMetadata = true;

        // If you use audiences, set them explicitly.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("events.read", p => p.RequireAuthenticatedUser());
    options.AddPolicy("events.write", p => p.RequireAuthenticatedUser());
});

// Health
builder.Services.AddHealthChecks();

// Observability (example)
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());

// MediatR
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Yapidoo.Service.Events.UseCases.Commands.CreateEventCommand).Assembly);
    cfg.RegisterServicesFromAssembly(typeof(Yapidoo.Service.Events.Domain.DomainEvents.EventCreatedDomainEvent).Assembly);
});

// AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// FluentValidation
builder.Services.AddValidatorsFromAssembly(typeof(Yapidoo.Service.Events.UseCases.Validators.CreateEventCommandValidator).Assembly);

// Repositories
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<IVenueRepository, VenueRepository>();
builder.Services.AddScoped<IEventHashtagRepository, EventHashtagRepository>();

// NOTE: CORS should typically be handled at the API Gateway edge.

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Yapidoo Events API v1");
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz");

// Apply migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<EventDbContext>();
    await context.Database.MigrateAsync();
}

app.Run();
```

### 5.4 appsettings.json
```json
{
  "ConnectionStrings": {
        "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=YapidooEventsDb;Trusted_Connection=True;MultipleActiveResultSets=true"
  },
    "Auth": {
        "Authority": "https://auth.yapidoo.local"
    },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

---

## 6. Database Migrations

### Create Initial Migration
```bash
cd Yapidoo.Service.Events.Api
dotnet ef migrations add InitialCreate --project ../Yapidoo.Service.Events.Data --context EventDbContext
dotnet ef database update --project ../Yapidoo.Service.Events.Data --context EventDbContext
```

---

## 7. Key Considerations for .NET 9

### 7.1 New Features to Leverage
- **Primary Constructors**: Use for dependency injection in classes
- **Collection Expressions**: Use `[]` syntax for collections
- **Improved LINQ**: Take advantage of new LINQ methods
- **Native AOT**: Consider for performance-critical scenarios

### 7.2 Updated Patterns
```csharp
// Using primary constructors
public class EventRepository(EventDbContext context) : Repository<Event>(context), IEventRepository
{
    // Implementation
}

// Collection expressions
public ICollection<Participation> Participations { get; set; } = [];
```

### 7.3 Performance Improvements
- Use `IAsyncEnumerable<T>` for large result sets
- Implement pagination for list queries
- Use compiled queries for frequently executed queries
- Consider using EF Core 9's new features like primitive collections

---

## 8. Testing Strategy

### 8.1 Unit Tests
- Test domain logic (Event aggregate methods, extensions)
- Test validators
- Test mapping profiles

### 8.2 Integration Tests
- Test command handlers with in-memory database
- Test repository implementations
- Test API endpoints

### 8.3 Example Test
```csharp
public class CreateEventCommandHandlerTests
{
    [Fact]
    public async Task Handle_ValidCommand_ReturnsEventViewModel()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<EventDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb")
            .Options;

        var mediator = Mock.Of<IMediator>();
        var context = new EventDbContext(options, mediator);
        var repository = new EventRepository(context);
        
        // Act & Assert
        // ...
    }
}
```

---

## 9. Deployment Checklist

- [ ] Configure proper connection strings for production
- [ ] Set up authentication/authorization middleware
- [ ] Configure logging (e.g., Serilog, Application Insights)
- [ ] Set up health checks
- [ ] Configure proper CORS policies
- [ ] Set up API versioning
- [ ] Implement rate limiting
- [ ] Configure Swagger for production (optional)
- [ ] Set up CI/CD pipelines
- [ ] Configure container orchestration (if using Docker/Kubernetes)

---

## 10. Additional Recommendations

### 10.1 Microservice Considerations
- Implement service-to-service communication (gRPC or HTTP)
- Add message bus integration (RabbitMQ, Azure Service Bus)
- Implement distributed tracing (OpenTelemetry)
- Add resilience patterns (Polly)

### 10.2 Security
- Implement JWT authentication
- Add authorization policies
- Validate and sanitize all inputs
- Implement rate limiting and throttling

### 10.3 Observability
- Add structured logging (Serilog)
- Implement health checks
- Add metrics (Prometheus)
- Set up distributed tracing

---

## Summary

This document provides a complete blueprint for recreating the Event aggregate in a new .NET 9 microservice. The architecture follows:

- **Domain-Driven Design (DDD)** with proper aggregate boundaries
- **CQRS** pattern with MediatR
- **Clean Architecture** with clear separation of concerns
- **Repository Pattern** for data access
- **Domain Events** for cross-aggregate communication
- **.NET 9 Best Practices** and modern C# features

The migration maintains all the business logic and relationships from the original system while modernizing the codebase for .NET 9.
