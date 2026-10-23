module pipe(
  input clk,
  input rst,
  input [7:0] a,
  input [7:0] b,
  input [7:0] c,
  output reg [7:0] y
);
  reg [7:0] sum_ab;
  always @(posedge clk) begin
    if (rst) begin
      sum_ab <= 8'd0;
      y <= 8'd0;
    end else begin
      sum_ab <= a + b;
      y <= sum_ab + c;
    end
  end
endmodule
