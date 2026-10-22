module add #(parameter WIDTH = 8) (
  input [WIDTH-1:0] a,
  input [WIDTH-1:0] b,
  output [WIDTH-1:0] sum
);
  // TODO: add a and b. The widths follow WIDTH.
  assign sum = {WIDTH{1'b0}};
endmodule
