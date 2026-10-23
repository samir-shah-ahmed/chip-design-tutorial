module impl(
  input a,
  input b,
  output y
);
  // TODO: match the spec function y = ~(a & b) using the nand2 cell.
  assign y = 1'b0;
endmodule
module nand2(input a, input b, output y);
  assign y = ~(a & b);
endmodule
