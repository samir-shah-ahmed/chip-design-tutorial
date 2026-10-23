module mux2(
  input sel,
  input [3:0] a,
  input [3:0] b,
  output reg [3:0] y
);
  // TODO: write this as a continuous assign. Both forms synthesize,
  // and the testbench only checks the function.
  always @(*) begin
    if (sel) y = b;
    else y = a;
  end
endmodule
