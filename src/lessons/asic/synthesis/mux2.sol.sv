module mux2(
  input sel,
  input [3:0] a,
  input [3:0] b,
  output [3:0] y
);
  assign y = sel ? b : a;
endmodule
