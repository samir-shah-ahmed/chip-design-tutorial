module add_reg(
  input clk,
  input rst,
  input [7:0] a,
  input [7:0] b,
  output reg [7:0] y
);
  always @(posedge clk) begin
    if (rst) y <= 0;
    else y <= a + b; // single cycle. The lesson asks for a registered input too.
  end
endmodule
