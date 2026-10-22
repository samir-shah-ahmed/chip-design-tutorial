module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst;
  wire [3:0] count;
  counter dut(.clk(clk), .rst(rst), .count(count));
  initial begin
    rst = 1;
    repeat (2) @(posedge clk);
    rst = 0;
    repeat (5) @(posedge clk);
    #1;
    if (count === 4'd5) $display("PASS count=%0d", count);
    else $display("FAIL count=%0d expect 5", count);
    $finish;
  end
endmodule
