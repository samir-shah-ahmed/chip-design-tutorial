module pipe(
  input clk,
  input rst,
  input [7:0] a,
  input [7:0] b,
  input [7:0] c,
  output reg [7:0] y
);
  // TODO: register the sum of a and b, then add c on the next clock.
  // The testbench expects y == (a+b+c) two clocks after the inputs are presented.
  always @(posedge clk) begin
    if (rst) y <= 8'd0;
    else y <= a + b + c;
  end
endmodule
