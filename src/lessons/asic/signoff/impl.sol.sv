module impl(
  input a,
  input b,
  output y
);
  nand2 u(.a(a), .b(b), .y(y));
endmodule
module nand2(input a, input b, output y);
  assign y = ~(a & b);
endmodule
