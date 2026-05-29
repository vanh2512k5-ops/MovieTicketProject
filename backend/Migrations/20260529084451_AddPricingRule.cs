using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieTicketAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PriceDetails",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PricingRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RuleType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RuleKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SurchargeAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingRules", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PricingRules");

            migrationBuilder.DropColumn(
                name: "PriceDetails",
                table: "Tickets");
        }
    }
}
