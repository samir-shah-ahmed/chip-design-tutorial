module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst_n;
  wire [3:0] count;
  tick dut(.clk(clk), .rst_n(rst_n), .count(count));
  initial begin
    rst_n = 0;
    repeat (2) @(posedge clk);
    @(negedge clk);
    rst_n = 1;
    repeat (3) @(posedge clk);
    #1;
    if (count === 4'd3) $display("PASS count=%0d", count);
    else $display("FAIL count=%0d", count);
    $finish;
  end
endmodule
