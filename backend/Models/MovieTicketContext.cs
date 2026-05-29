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
        public DbSet<BookingCombo> BookingCombos { get; set; }
        public DbSet<PricingRule> PricingRules { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Booking>().Property(b => b.TotalPrice).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Combo>().Property(c => c.Price).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Showtime>().Property(s => s.BasePrice).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Ticket>().Property(t => t.Price).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<PricingRule>().Property(p => p.SurchargeAmount).HasColumnType("decimal(18,2)");

            // Global Query Filter: Tự động bỏ qua các ghế đã bị xóa mềm (IsDeleted = true)
            modelBuilder.Entity<Seat>().HasQueryFilter(s => !s.IsDeleted);

            modelBuilder.Entity<Booking>()
                .HasMany(b => b.Tickets)
                .WithOne(t => t.Booking)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Ticket>()
                .HasOne(t => t.Seat)
                .WithMany()
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<BookingCombo>().Property(bc => bc.Price).HasColumnType("decimal(18,2)");

            modelBuilder.Entity<BookingCombo>()
                .HasOne(bc => bc.Booking)
                .WithMany(b => b.BookingCombos)
                .HasForeignKey(bc => bc.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BookingCombo>()
                .HasOne(bc => bc.Combo)
                .WithMany()
                .HasForeignKey(bc => bc.ComboId)
                .OnDelete(DeleteBehavior.Restrict);

            base.OnModelCreating(modelBuilder);
        }
    }
}