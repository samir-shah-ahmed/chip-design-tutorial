module tt_um_counter(
  input [7:0] ui_in,
  output reg [7:0] uo_out,
  input [7:0] uio_in,
  output [7:0] uio_out,
  output [7:0] uio_oe,
  input ena,
  input clk,
  input rst_n
);
  assign uio_out = 8'd0;
  assign uio_oe = 8'd0;
  always @(posedge clk) begin
    if (!rst_n)
      uo_out <= 8'd0;
    else if (ena)
      uo_out <= uo_out; // TODO: increment when ena is high
  end
endmodule
