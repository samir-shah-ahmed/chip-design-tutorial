module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst;
  wire ce;
  integer highs;
  integer i;
  enable_div dut(.clk(clk), .rst(rst), .ce(ce));
  initial begin
    rst = 1; highs = 0;
    repeat (2) @(posedge clk);
    rst = 0;
    for (i = 0; i < 8; i = i + 1) begin
      @(posedge clk); #1;
      if (ce === 1'b1) highs = highs + 1;
    end
    if (highs == 2) $display("PASS ce pulses=%0d", highs);
    else $display("FAIL ce pulses=%0d expect 2", highs);
    $finish;
  end
endmodule
