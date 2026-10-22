module add_reg(
  input clk,
  input rst,
  input [7:0] a,
  input [7:0] b,
  output reg [7:0] y
);
  reg [7:0] a_r, b_r;
  always @(posedge clk) begin
    if (rst) begin
      a_r <= 0;
      b_r <= 0;
      y <= 0;
    end else begin
      a_r <= a;
      b_r <= b;
      y <= a_r + b_r;
    end
  end
endmodule
