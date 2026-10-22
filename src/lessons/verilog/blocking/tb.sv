module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst;
  wire a, b;
  exch dut(.clk(clk), .rst(rst), .a(a), .b(b));
  initial begin
    rst = 1;
    repeat (2) @(posedge clk);
    rst = 0;
    @(posedge clk); #1;
    if (a === 1'b1 && b === 1'b0)
      $display("PASS swapped to a=%b b=%b", a, b);
    else
      $display("FAIL a=%b b=%b (expect a=1 b=0)", a, b);
    $finish;
  end
endmodule
