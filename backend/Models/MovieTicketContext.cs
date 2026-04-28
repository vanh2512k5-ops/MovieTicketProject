using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace MovieTicketAPI.Models
{
    public class MovieTicketContext : DbContext
    {
        public MovieTicketContext(DbContextOptions<MovieTicketContext> options) : base(options) { }

        public DbSet<Actor> Actors { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Cinema> Cinemas { get; set; }
        public DbSet<Combo> Combos { get; set; }
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<Showtime> Showtimes { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Booking>().Property(b => b.TotalPrice).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Combo>().Property(c => c.Price).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Showtime>().Property(s => s.BasePrice).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Ticket>().Property(t => t.Price).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Booking>()
                .HasMany(b => b.Tickets)
                .WithOne(t => t.Booking)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Seat)
                .WithMany()
                .OnDelete(DeleteBehavior.Restrict);

            base.OnModelCreating(modelBuilder);
        }
    }
}