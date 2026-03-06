module top;
  reg a, b;
  wire nand_result, demorgan_result;
  // TODO: assign nand_result = ~(a & b)
  // TODO: assign demorgan_result = (~a | ~b)
  // Then verify they are equal for all inputs

  initial begin
    // TODO: test all 4 input combinations and verify equality
    $finish;
  end
endmodule
