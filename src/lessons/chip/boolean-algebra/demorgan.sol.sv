module top;
  reg a, b;
  wire nand_result, demorgan_result;

  assign nand_result    = ~(a & b);
  assign demorgan_result = (~a | ~b);

  initial begin
    a = 0; b = 0; #1;
    $display("a=%b b=%b | ~(a&b)=%b (~a|~b)=%b match=%b", a, b, nand_result, demorgan_result, nand_result === demorgan_result);
    a = 0; b = 1; #1;
    $display("a=%b b=%b | ~(a&b)=%b (~a|~b)=%b match=%b", a, b, nand_result, demorgan_result, nand_result === demorgan_result);
    a = 1; b = 0; #1;
    $display("a=%b b=%b | ~(a&b)=%b (~a|~b)=%b match=%b", a, b, nand_result, demorgan_result, nand_result === demorgan_result);
    a = 1; b = 1; #1;
    $display("a=%b b=%b | ~(a&b)=%b (~a|~b)=%b match=%b", a, b, nand_result, demorgan_result, nand_result === demorgan_result);
    $display("De Morgan's Law verified!");
    $finish;
  end
endmodule
