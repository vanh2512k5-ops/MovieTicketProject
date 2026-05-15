using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MovieTicketAPI.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDynamicSeatLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Row",
                table: "Seats");

            migrationBuilder.RenameColumn(
                name: "Number",
                table: "Seats",
                newName: "SeatNumber");

            migrationBuilder.AddColumn<int>(
                name: "GridColumn",
                table: "Seats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "GridRow",
                table: "Seats",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Seats",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RowName",
                table: "Seats",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<bool>(
                name: "IsLayoutConfigured",
                table: "Rooms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TotalColumns",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalRows",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GridColumn",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "GridRow",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "RowName",
                table: "Seats");

            migrationBuilder.DropColumn(
                name: "IsLayoutConfigured",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "TotalColumns",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "TotalRows",
                table: "Rooms");

            migrationBuilder.RenameColumn(
                name: "SeatNumber",
                table: "Seats",
                newName: "Number");

            migrationBuilder.AddColumn<string>(
                name: "Row",
                table: "Seats",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
